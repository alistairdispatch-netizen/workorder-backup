"""
Orders Router
Handles work order CRUD operations with role-based access control.
"""

import os
import logging
import asyncio
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from database import get_db
from models import (
    Order, Member, UserRole, Unit, Location, FaultCategory,
    OrderFaultCategory, OrderPhoto, PhotoType, RepairStatus
)
from schemas import (
    OrderCreate, OrderUpdate, OrderResponse, OrderListResponse,
    PhotoUploadResponse
)
from auth import get_current_active_user
from utils.image_utils import (
    process_and_save_thumbnail, validate_image,
    ensure_directory, get_photo_directory, generate_photo_filename,
    delete_photo_file, THUMBNAIL_SIZE, THUMBNAIL_QUALITY
)
import filelock

# File lock to serialize photo processing and prevent memory spikes
_photo_lock = filelock.FileLock("/tmp/photo_processing.lock")

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# Photo configuration
PHOTO_BASE_PATH = os.getenv("PHOTO_BASE_PATH", "/home/devop/workorder-system/photos")
MAX_BEFORE_PHOTOS = 4
MAX_AFTER_PHOTOS = 4


def generate_order_number(db: Session) -> str:
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"WO-{today}-"
    last_order = db.query(Order).filter(
        Order.order_number.like(f"{prefix}%")
    ).order_by(desc(Order.id)).first()
    if last_order:
        try:
            last_seq = int(last_order.order_number.split("-")[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"


async def save_uploaded_photo(
    file: UploadFile,
    order_number: str,
    photo_type: str,
    photo_number: int
) -> Optional[str]:
    photo_dir = get_photo_directory(PHOTO_BASE_PATH, order_number)
    ensure_directory(photo_dir)
    filename = generate_photo_filename(order_number, photo_type, photo_number)
    file_path = os.path.join(photo_dir, filename)
    temp_path = f"/tmp/{filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    is_valid, error = validate_image(temp_path)
    if not is_valid:
        logger.error(f"Image validation failed: {error}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return None
    success = process_and_save_thumbnail(temp_path, file_path)
    if os.path.exists(temp_path):
        os.remove(temp_path)
    return file_path if success else None


@router.get("/", response_model=List[OrderListResponse])
async def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    query = db.query(Order).options(
        
    ).filter(Order.is_deleted == False)
    if current_user.role == UserRole.USER:
        query = query.filter(Order.created_by == current_user.id)
    orders = query.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()
    return [
        OrderListResponse(
            id=o.id,
            order_number=o.order_number,
            created_at=o.created_at,
            creator_name=o.creator.username if o.creator else None,
            unit_name=o.unit,
            location_name=o.location,
            fault_categories=o.fault_categories or [],
            fault_description=(o.fault_description[:30] + '...') if o.fault_description and len(o.fault_description) > 30 else (o.fault_description or ''),
            status_name=o.status,
            last_updated=o.last_updated
        )
        for o in orders
    ]


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    order = db.query(Order).options(
        joinedload(Order.photos)
    ).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    unit_name = order.unit
    location_name = order.location
    if order.unit:
        unit_record = db.query(Unit).filter(Unit.name == order.unit).first()
        if unit_record:
            unit_name = unit_record.name
    if order.location:
        location_record = db.query(Location).filter(Location.name == order.location).first()
        if location_record:
            location_name = location_record.name
    photo_list = [
        {
            "id": p.id,
            "photo_type": p.photo_type,
            "photo_number": p.photo_number,
            "path": p.path,
            "version": p.version,
            "created_at": p.created_at,
            "file_url": f"/api/orders/{order.id}/photos/{p.photo_type}/{p.photo_number}",
        }
        for p in sorted(order.photos, key=lambda x: (x.photo_type, x.photo_number))
        if not p.is_deleted
    ]
    return {
        "id": order.id,
        "order_number": order.order_number,
        "created_at": order.created_at,
        "created_by": order.created_by,
        "creator_name": order.creator.username if order.creator else None,
        "unit": order.unit,
        "unit_name": unit_name,
        "location": order.location,
        "location_name": location_name,
        "fault_categories": order.fault_categories or [],
        "fault_description": order.fault_description,
        "treatment": order.treatment,
        "contractor": order.contractor_unit.name if current_user.role != UserRole.GUEST and order.contractor_unit else None,
        "status": order.status,
        "status_name": order.status,
        "last_updated": order.last_updated,
        "is_deleted": order.is_deleted,
        "photos": photo_list,
    }


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    unit = db.query(Unit).filter(
        Unit.name == order_data.unit,
        Unit.is_active == True
    ).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="找不到該單位，請重新選擇"
        )
    location = db.query(Location).filter(
        Location.name == order_data.location,
        Location.unit_id == unit.id,
        Location.is_active == True
    ).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="找不到該地點，請確認所屬單位"
        )
    if order_data.fault_categories:
        existing_cats = db.query(FaultCategory).filter(
            FaultCategory.name.in_(order_data.fault_categories),
            FaultCategory.is_active == True
        ).all()
        existing_cat_names = {c.name for c in existing_cats}
        invalid_cats = [c for c in order_data.fault_categories if c not in existing_cat_names]
        if invalid_cats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"故障類別不存在：{invalid_cats}，請重新選擇"
            )
    order_number = generate_order_number(db)
    order = Order(
        order_number=order_number,
        created_by=current_user.id,
        unit=order_data.unit,
        location=order_data.location,
        fault_categories=order_data.fault_categories or [],
        fault_description=order_data.fault_description,
        treatment=order_data.treatment,
        contractor_unit_id=order_data.contractor_unit_id,
        status=order_data.status or "待處理"
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    logger.info(f"Order created: {order_number} by {current_user.username}")
    return order


@router.put("/{order_id}")
async def update_order(
    order_id: int,
    order_data: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    if current_user.role == UserRole.USER and order.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order"
        )
    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot update orders"
        )

    # Update fields using name-based fields from OrderUpdate schema
    if order_data.unit is not None:
        unit = db.query(Unit).filter(
            Unit.name == order_data.unit,
            Unit.is_active == True
        ).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="找不到該單位，請重新選擇"
            )
        order.unit = order_data.unit
    if order_data.location is not None:
        # Need unit for validation - use updated or existing
        unit_name = order_data.unit if order_data.unit is not None else order.unit
        unit_for_loc = db.query(Unit).filter(Unit.name == unit_name, Unit.is_active == True).first()
        loc_filter = [
            Location.name == order_data.location,
            Location.is_active == True
        ]
        if unit_for_loc:
            loc_filter.append(Location.unit_id == unit_for_loc.id)
        location = db.query(Location).filter(*loc_filter).first()
        if not location:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="找不到該地點，請確認所屬單位"
            )
        order.location = order_data.location
    if order_data.fault_categories is not None:
        order.fault_categories = order_data.fault_categories
    if order_data.fault_description is not None:
        order.fault_description = order_data.fault_description
    if order_data.treatment is not None:
        order.treatment = order_data.treatment
    if order_data.contractor_unit_id is not None and current_user.role == UserRole.ADMIN:
        order.contractor_unit_id = order_data.contractor_unit_id
    if order_data.status is not None:
        order.status = order_data.status

    order.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(order)

    logger.info(f"Order updated: {order.order_number}")

    # Build response matching OrderResponse
    unit_name = order.unit
    location_name = order.location
    if order.unit:
        unit_record = db.query(Unit).filter(Unit.name == order.unit).first()
        if unit_record:
            unit_name = unit_record.name
    if order.location:
        location_record = db.query(Location).filter(Location.name == order.location).first()
        if location_record:
            location_name = location_record.name

    return {
        "id": order.id,
        "order_number": order.order_number,
        "created_at": order.created_at,
        "created_by": order.created_by,
        "creator_name": order.creator.username if order.creator else None,
        "unit": order.unit,
        "unit_name": unit_name,
        "location": order.location,
        "location_name": location_name,
        "fault_categories": order.fault_categories or [],
        "fault_description": order.fault_description,
        "treatment": order.treatment,
        "contractor": order.contractor_unit.name if order.contractor_unit else None,
        "status": order.status,
        "status_name": order.status,
        "last_updated": order.last_updated,
        "is_deleted": order.is_deleted,
        "photos": [],
    }


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    if current_user.role == UserRole.USER and order.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this order"
        )
    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot delete orders"
        )
    order.is_deleted = True
    order.deleted_at = datetime.utcnow()
    db.commit()
    logger.info(f"Order deleted: {order.order_number}")


@router.post("/{order_id}/restore", response_model=OrderResponse)
async def restore_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can restore orders"
        )
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == True
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deleted order not found"
        )
    order.is_deleted = False
    order.deleted_at = None
    db.commit()
    db.refresh(order)
    logger.info(f"Order restored: {order.order_number}")
    order = db.query(Order).options(
        
        joinedload(Order.fault_categories).joinedload(OrderFaultCategory.fault_category)
    ).filter(Order.id == order.id).first()
    return order


@router.post("/{order_id}/photos", response_model=PhotoUploadResponse)
async def upload_photo(
    order_id: int,
    photo_type: PhotoType,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot upload photos"
        )
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    if current_user.role == UserRole.USER and order.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload photos to this order"
        )
    max_photos = MAX_BEFORE_PHOTOS if photo_type == PhotoType.BEFORE else MAX_AFTER_PHOTOS
    existing_count = db.query(OrderPhoto).filter(
        OrderPhoto.order_id == order_id,
        OrderPhoto.photo_type == photo_type,
        OrderPhoto.is_deleted == False
    ).count()
    if existing_count >= max_photos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {max_photos} {photo_type} photos allowed"
        )
    next_number = existing_count + 1
    await asyncio.sleep(3)
    with _photo_lock:
        file_path = await save_uploaded_photo(
        file, order.order_number,
        photo_type.value, next_number
    )
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and save photo"
        )
    photo = OrderPhoto(
        order_id=order_id,
        photo_type=photo_type,
        photo_number=next_number,
        path=file_path,
        version=1
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    logger.info(f"Photo uploaded: {order.order_number} {photo_type.value} #{next_number}")
    return PhotoUploadResponse(
        id=photo.id,
        photo_type=photo.photo_type,
        photo_number=photo.photo_number,
        path=photo.path,
        version=photo.version,
        created_at=photo.created_at,
    )


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot delete photos"
        )
    photo = db.query(OrderPhoto).filter(
        OrderPhoto.id == photo_id,
        OrderPhoto.is_deleted == False
    ).first()
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    if current_user.role == UserRole.USER:
        order = db.query(Order).filter(Order.id == photo.order_id).first()
        if order.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this photo"
            )
    photo.is_deleted = True
    photo.deleted_at = datetime.utcnow()
    db.commit()
    logger.info(f"Photo deleted: {photo_id}")


@router.post("/photos/{photo_id}/restore", response_model=PhotoUploadResponse)
async def restore_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can restore photos"
        )
    photo = db.query(OrderPhoto).filter(
        OrderPhoto.id == photo_id,
        OrderPhoto.is_deleted == True
    ).first()
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deleted photo not found"
        )
    if not os.path.exists(photo.path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found on disk"
        )
    photo.is_deleted = False
    photo.deleted_at = None
    db.commit()
    db.refresh(photo)
    logger.info(f"Photo restored: {photo_id}")
    return PhotoUploadResponse(
        id=photo.id,
        photo_type=photo.photo_type,
        photo_number=photo.photo_number,
        path=photo.path,
        version=photo.version,
        created_at=photo.created_at,
    )
