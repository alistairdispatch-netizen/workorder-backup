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

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# Photo configuration
PHOTO_BASE_PATH = os.getenv("PHOTO_BASE_PATH", "/volume1/docker/workorder/photos")
MAX_BEFORE_PHOTOS = 10
MAX_AFTER_PHOTOS = 10


def generate_order_number(db: Session) -> str:
    """
    Generate a unique order number in format: WO-YYYYMMDD-NNNN

    Args:
        db: Database session

    Returns:
        A unique order number
    """
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"WO-{today}-"

    # Get the latest order number with this prefix
    last_order = db.query(Order).filter(
        Order.order_number.like(f"{prefix}%")
    ).order_by(desc(Order.id)).first()

    if last_order:
        # Extract the sequence number and increment
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
    """
    Process and save an uploaded photo as a thumbnail.

    Args:
        file: The uploaded file
        order_number: The order number for path
        photo_type: "before" or "after"
        photo_number: Photo sequence number

    Returns:
        The saved file path or None if failed
    """
    # Ensure photo directory exists
    photo_dir = get_photo_directory(PHOTO_BASE_PATH, order_number)
    ensure_directory(photo_dir)

    # Generate filename
    filename = generate_photo_filename(order_number, photo_type, photo_number)
    file_path = os.path.join(photo_dir, filename)

    # Save uploaded file temporarily
    temp_path = f"/tmp/{filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Validate and process image
    is_valid, error = validate_image(temp_path)
    if not is_valid:
        logger.error(f"Image validation failed: {error}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return None

    # Create thumbnail and save
    success = process_and_save_thumbnail(temp_path, file_path)

    # Remove temporary file
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
    """
    List orders with pagination.
    - Admins: see all orders
    - Users: see own orders only
    - Guests: see all orders (limited fields)

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        current_user: The authenticated user

    Returns:
        List of orders
    """
    query = db.query(Order).options(
        
    ).filter(Order.is_deleted == False)

    # Users only see their own orders
    if current_user.role == UserRole.USER:
        query = query.filter(Order.creator_id == current_user.id)

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
            fault_description=o.fault_description[:30] + '...' if o.fault_description and len(o.fault_description) > 30 else (o.fault_description or ''),
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
    """
    Get a specific order with full details.
    - Admins/Users: full details including worker field
    - Guests: worker field hidden

    Args:
        order_id: The order ID
        db: Database session
        current_user: The authenticated user

    Returns:
        Order details

    Raises:
        HTTPException: If order not found or unauthorized
    """
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

    # 查詢單位與地點名稱（Order.unit/location 為字串，對應 Unit.name / Location.name）
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

    # 手動建構回應，附加 unit_name / location_name / photos
    photo_list = [
        {
            "id": p.id,
            "photo_type": p.photo_type,
            "photo_number": p.photo_number,
            "path": p.path,
            "version": p.version,
            "created_at": p.created_at,
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
        "contractor": order.contractor if current_user.role != UserRole.GUEST else None,
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
    """
    Create a new work order.

    Args:
        order_data: Order creation data
        db: Database session
        current_user: The authenticated user

    Returns:
        The created order

    Raises:
        HTTPException: If validation fails
    """
    # Validate unit exists
    unit = db.query(Unit).filter(
        Unit.id == order_data.unit_id,
        Unit.is_deleted == False
    ).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid unit"
        )

    # Validate location exists and belongs to unit
    location = db.query(Location).filter(
        Location.id == order_data.location_id,
        Location.unit_id == order_data.unit_id,
        Location.is_deleted == False
    ).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid location for selected unit"
        )

    # Validate fault categories
    if order_data.fault_category_ids:
        categories = db.query(FaultCategory).filter(
            FaultCategory.id.in_(order_data.fault_category_ids),
            FaultCategory.is_deleted == False
        ).all()
        if len(categories) != len(order_data.fault_category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more fault categories are invalid"
            )

    # Generate order number
    order_number = generate_order_number(db)

    # Create order
    order = Order(
        order_number=order_number,
        creator_id=current_user.id,
        unit_id=order_data.unit_id,
        location_id=order_data.location_id,
        fault_description=order_data.fault_description,
        handling_method=order_data.handling_method,
        worker=order_data.worker if current_user.role != UserRole.GUEST else None,
        repair_status_id=order_data.repair_status_id
    )

    db.add(order)
    db.flush()  # Get the order ID

    # Add fault categories
    if order_data.fault_category_ids:
        for cat_id in order_data.fault_category_ids:
            order_fault = OrderFaultCategory(
                order_id=order.id,
                fault_category_id=cat_id
            )
            db.add(order_fault)

    db.commit()
    db.refresh(order)

    logger.info(f"Order created: {order_number} by {current_user.username}")

    # Reload with relationships
    order = db.query(Order).options(
        
        joinedload(Order.fault_categories).joinedload(OrderFaultCategory.fault_category)
    ).filter(Order.id == order.id).first()

    return order


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_data: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Update an order.
    - Admins: can update any order
    - Users: can only update their own orders
    - Guests: cannot update

    Args:
        order_id: The order ID
        order_data: Update data
        db: Database session
        current_user: The authenticated user

    Returns:
        Updated order

    Raises:
        HTTPException: If order not found or unauthorized
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Check permissions
    if current_user.role == UserRole.USER and order.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order"
        )

    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot update orders"
        )

    # Update fields
    if order_data.location_id is not None:
        order.location_id = order_data.location_id

    if order_data.fault_category_ids is not None:
        # Remove existing and add new
        db.query(OrderFaultCategory).filter(
            OrderFaultCategory.order_id == order_id
        ).delete()

        for cat_id in order_data.fault_category_ids:
            order_fault = OrderFaultCategory(
                order_id=order_id,
                fault_category_id=cat_id
            )
            db.add(order_fault)

    if order_data.fault_description is not None:
        order.fault_description = order_data.fault_description

    if order_data.handling_method is not None:
        order.handling_method = order_data.handling_method

    # Only admins can update worker
    if order_data.worker is not None and current_user.role == UserRole.ADMIN:
        order.worker = order_data.worker

    if order_data.repair_status_id is not None:
        order.repair_status_id = order_data.repair_status_id

    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)

    logger.info(f"Order updated: {order.order_number}")

    # Reload with relationships
    order = db.query(Order).options(
        
        joinedload(Order.fault_categories).joinedload(OrderFaultCategory.fault_category)
    ).filter(Order.id == order.id).first()

    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Soft delete an order.
    - Admins: can delete any order
    - Users: can only delete their own orders
    - Guests: cannot delete

    Args:
        order_id: The order ID
        db: Database session
        current_user: The authenticated user
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Check permissions
    if current_user.role == UserRole.USER and order.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this order"
        )

    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot delete orders"
        )

    # Soft delete
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
    """
    Restore a soft-deleted order. Admin only.

    Args:
        order_id: The order ID
        db: Database session
        current_user: The authenticated admin

    Returns:
        Restored order
    """
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

    # Reload with relationships
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
    """
    Upload a photo for an order.
    - Admins: can upload to any order
    - Users: can only upload to their own orders
    - Guests: cannot upload

    Args:
        order_id: The order ID
        photo_type: "before" or "after"
        file: The image file
        db: Database session
        current_user: The authenticated user

    Returns:
        Upload confirmation with photo details
    """
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

    # Check permissions
    if current_user.role == UserRole.USER and order.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload photos to this order"
        )

    # Check photo count limit
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

    # Determine photo number
    next_number = existing_count + 1

    # Rate limiting - wait 3-5 seconds
    await asyncio.sleep(3)

    # Save photo
    file_path = await save_uploaded_photo(
        file, order.order_number,
        photo_type.value, next_number
    )

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and save photo"
        )

    # Create photo record
    photo = OrderPhoto(
        order_id=order_id,
        photo_type=photo_type,
        photo_number=next_number,
        file_path=file_path,
        thumbnail_path=file_path,  # Same as original since we store only thumbnail
        version=1
    )

    db.add(photo)
    db.commit()
    db.refresh(photo)

    logger.info(f"Photo uploaded: {order.order_number} {photo_type.value} #{next_number}")

    return PhotoUploadResponse(
        id=photo.id,
        order_id=order_id,
        photo_type=photo_type,
        photo_number=next_number,
        file_path=file_path,
        message="Photo uploaded successfully"
    )


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Soft delete a photo.
    - Admins: can delete any photo
    - Users: can only delete photos from their own orders
    - Guests: cannot delete

    Args:
        photo_id: The photo ID
        db: Database session
        current_user: The authenticated user
    """
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

    # Check permissions
    if current_user.role == UserRole.USER:
        order = db.query(Order).filter(Order.id == photo.order_id).first()
        if order.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this photo"
            )

    # Soft delete
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
    """
    Restore a soft-deleted photo. Admin only.

    Args:
        photo_id: The photo ID
        db: Database session
        current_user: The authenticated admin

    Returns:
        Restored photo details
    """
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

    # Check if file still exists
    if not os.path.exists(photo.file_path):
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
        order_id=photo.order_id,
        photo_type=photo.photo_type,
        photo_number=photo.photo_number,
        file_path=photo.file_path,
        message="Photo restored successfully"
    )