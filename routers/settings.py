"""
Settings Router
Provides a combined view of all configurable settings.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Unit, Location, FaultCategory, Status as RepairStatus, Member, UserRole, Order
from schemas import SettingsResponse
from auth import get_current_active_user, get_max_members_limit, require_role

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/", response_model=SettingsResponse)
async def get_all_settings(
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Get all configurable settings in one call.
    Includes units, locations, fault categories, repair statuses, and limits.
    """
    units = db.query(Unit).filter(Unit.is_active == True, Unit.is_deleted == False).order_by(Unit.sort_order, Unit.id).all()
    locations = db.query(Location).filter(Location.is_active == True, Location.is_deleted == False).order_by(Location.sort_order, Location.id).all()
    fault_categories = db.query(FaultCategory).filter(
        FaultCategory.is_active == True,
        FaultCategory.is_deleted == False,
    ).order_by(FaultCategory.sort_order, FaultCategory.id).all()
    repair_statuses = db.query(RepairStatus).filter(RepairStatus.is_active == True, RepairStatus.is_deleted == False, RepairStatus.name != "已存封").order_by(RepairStatus.sort_order, RepairStatus.id).all()
    
    formatted_statuses = [
        {"id": s.id, "name": s.name, "color": s.color or "#888888", "sort_order": s.sort_order}
        for s in repair_statuses
    ]
    
    return SettingsResponse(
        units=units,
        locations=locations,
        fault_categories=fault_categories,
        repair_statuses=formatted_statuses,
        max_members=get_max_members_limit()
    )


# ============ Units (刪除端點) ============

@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a unit and cascade to child locations and orders. Admin only.
    """
    unit = db.query(Unit).filter(
        Unit.id == unit_id,
        Unit.is_deleted == False
    ).first()
    
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )
    
    # Soft delete all child locations
    db.query(Location).filter(
        Location.unit_id == unit_id,
        Location.is_deleted == False
    ).update({"is_deleted": True})
    
    # Set all related orders to "已存封" and record archived_unit_id
    db.query(Order).filter(
        Order.unit == unit.name,
        Order.is_deleted == False
    ).update({
        "status": "已存封",
        "archived_unit_id": unit_id
    })
    
    # Soft delete the unit itself
    unit.is_deleted = True
    db.commit()
    
    logger.info(f"Unit deleted (cascading): {unit.name}")


# ============ Locations (刪除端點) ============

@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a location and archive related orders. Admin only.
    """
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.is_deleted == False
    ).first()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Get the unit name for archiving orders
    unit = db.query(Unit).filter(Unit.id == location.unit_id).first()
    unit_id = unit.id if unit else None
    
    # Set all related orders to "已存封" and record archived_unit_id
    db.query(Order).filter(
        Order.location == location.name,
        Order.unit == (unit.name if unit else None),
        Order.is_deleted == False
    ).update({
        "status": "已存封",
        "archived_unit_id": unit_id
    })
    
    # Soft delete the location
    location.is_deleted = True
    db.commit()
    
    logger.info(f"Location deleted (orders archived): {location.name}")


# ============ Fault Categories (刪除端點) ============

@router.delete("/fault-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fault_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a fault category. Admin only.
    """
    category = db.query(FaultCategory).filter(
        FaultCategory.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fault category not found"
        )
    
    db.delete(category)
    db.commit()
    
    logger.info(f"Fault category hard deleted: {category.name}")


# ============ Repair Statuses (刪除端點) ============

@router.delete("/statuses/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repair_status(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a repair status. Admin only.
    """
    status_obj = db.query(RepairStatus).filter(
        RepairStatus.id == status_id
    ).first()
    
    if not status_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair status not found"
        )
    
    # Protect "已存封" status from deletion
    if status_obj.name == "已存封":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無法刪除「已存封」狀態，這是系統保護狀態"
        )
    
    db.delete(status_obj)
    db.commit()
    
    logger.info(f"Repair status hard deleted: {status_obj.name}")
