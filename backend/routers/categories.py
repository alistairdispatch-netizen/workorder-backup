"""
Categories Router
Handles configurable settings: units, locations, fault categories, repair statuses.
Admin-only access for CRUD operations.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Unit, Location, FaultCategory, Status as RepairStatus, Member, UserRole, Order
)
from schemas import (
    UnitCreate, UnitUpdate, UnitResponse,
    LocationCreate, LocationResponse,
    FaultCategoryCreate, FaultCategoryResponse,
    StatusCreate as RepairStatusCreate, StatusResponse as RepairStatusResponse
)
from auth import get_current_active_user, require_role

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/categories", tags=["Categories"])


# ============ Units (區處) ============

@router.get("/units", response_model=List[UnitResponse])
async def list_units(
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    List all units (區處).
    All authenticated users can view units.
    
    Args:
        db: Database session
        current_user: The authenticated user
        
    Returns:
        List of units
    """
    units = db.query(Unit).filter(Unit.is_deleted == False).all()
    return units


@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    unit_data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new unit. Admin only.
    
    Args:
        unit_data: Unit creation data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Created unit
        
    Raises:
        HTTPException: If unit name already exists
    """
    # Check if name exists
    existing = db.query(Unit).filter(Unit.name == unit_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit with this name already exists"
        )
    
    unit = Unit(name=unit_data.name)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    
    logger.info(f"Unit created: {unit.name}")
    return unit


@router.put("/units/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: int,
    unit_data: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Update a unit. Admin only.
    
    Args:
        unit_id: The unit ID
        unit_data: Update data (all fields optional)
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Updated unit
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
    
    # Update name if provided
    if unit_data.name is not None:
        # Check if name exists (excluding current)
        existing = db.query(Unit).filter(
            Unit.name == unit_data.name,
            Unit.id != unit_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unit with this name already exists"
            )
        unit.name = unit_data.name
    
    # Update sort_order if provided
    if unit_data.sort_order is not None:
        unit.sort_order = unit_data.sort_order
    
    # Update is_active if provided
    if unit_data.is_active is not None:
        unit.is_active = unit_data.is_active
    
    db.commit()
    db.refresh(unit)
    
    logger.info(f"Unit updated: {unit.name}")
    return unit


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a unit and cascade to child locations and orders. Admin only.
    
    Cascading behavior:
    - Soft deletes all child locations (is_deleted=True)
    - Changes all related orders to "已存封" status and sets archived_unit_id
    
    Args:
        unit_id: The unit ID
        db: Database session
        current_user: The authenticated admin
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


# ============ Locations (地點) ============

@router.get("/locations", response_model=List[LocationResponse])
async def list_locations(
    unit_id: Optional[int] = Query(None, description="Filter by unit ID"),
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    List all locations, optionally filtered by unit.
    All authenticated users can view locations.
    
    Args:
        unit_id: Optional unit ID to filter by
        db: Database session
        current_user: The authenticated user
        
    Returns:
        List of locations
    """
    query = db.query(Location).filter(Location.is_deleted == False)
    
    if unit_id is not None:
        query = query.filter(Location.unit_id == unit_id)
    
    locations = query.all()
    return locations


@router.post("/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new location. Admin only.
    
    Args:
        location_data: Location creation data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Created location
        
    Raises:
        HTTPException: If validation fails
    """
    # Verify unit exists
    unit = db.query(Unit).filter(
        Unit.id == location_data.unit_id,
        Unit.is_deleted == False
    ).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit not found"
        )
    
    # Check if location name exists for this unit
    existing = db.query(Location).filter(
        Location.name == location_data.name,
        Location.unit_id == location_data.unit_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location with this name already exists in this unit"
        )
    
    location = Location(
        name=location_data.name,
        unit_id=location_data.unit_id
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    
    logger.info(f"Location created: {location.name} (unit: {unit.name})")
    return location


@router.put("/locations/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Update a location. Admin only.
    
    Args:
        location_id: The location ID
        location_data: Update data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Updated location
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
    
    # Verify unit exists
    unit = db.query(Unit).filter(
        Unit.id == location_data.unit_id,
        Unit.is_deleted == False
    ).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit not found"
        )
    
    location.name = location_data.name
    location.unit_id = location_data.unit_id
    db.commit()
    db.refresh(location)
    
    logger.info(f"Location updated: {location.name}")
    return location


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a location and archive related orders. Admin only.
    
    Cascading behavior:
    - Changes all related orders to "已存封" status and sets archived_unit_id
    
    Args:
        location_id: The location ID
        db: Database session
        current_user: The authenticated admin
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


# ============ Fault Categories (故障類別) ============

@router.get("/fault-categories", response_model=List[FaultCategoryResponse])
async def list_fault_categories(
    parent_id: Optional[int] = Query(None, description="Filter by parent category"),
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    List all fault categories, optionally filtered by parent.
    Returns hierarchical structure if no filter applied.
    All authenticated users can view categories.
    
    Args:
        parent_id: Optional parent category ID
        db: Database session
        current_user: The authenticated user
        
    Returns:
        List of fault categories
    """
    query = db.query(FaultCategory).filter(FaultCategory.is_deleted == False)
    
    if parent_id is not None:
        query = query.filter(FaultCategory.parent_id == parent_id)
    else:
        # Return top-level categories with children nested
        query = query.filter(FaultCategory.parent_id == None)
    
    categories = query.all()
    return categories


@router.post("/fault-categories", response_model=FaultCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_fault_category(
    category_data: FaultCategoryCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new fault category. Admin only.
    
    Args:
        category_data: Fault category creation data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Created fault category
    """
    # Verify parent exists if specified
    if category_data.parent_id is not None:
        parent = db.query(FaultCategory).filter(
            FaultCategory.id == category_data.parent_id,
            FaultCategory.is_deleted == False
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent category not found"
            )
    
    category = FaultCategory(
        name=category_data.name,
        parent_id=category_data.parent_id
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    
    logger.info(f"Fault category created: {category.name}")
    return category


@router.put("/fault-categories/{category_id}", response_model=FaultCategoryResponse)
async def update_fault_category(
    category_id: int,
    category_data: FaultCategoryCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Update a fault category. Admin only.
    
    Args:
        category_id: The category ID
        category_data: Update data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Updated fault category
    """
    category = db.query(FaultCategory).filter(
        FaultCategory.id == category_id,
        FaultCategory.is_deleted == False
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fault category not found"
        )
    
    # Verify parent exists if specified
    if category_data.parent_id is not None:
        # Prevent circular reference
        if category_data.parent_id == category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category cannot be its own parent"
            )
        
        parent = db.query(FaultCategory).filter(
            FaultCategory.id == category_data.parent_id,
            FaultCategory.is_deleted == False
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent category not found"
            )
    
    category.name = category_data.name
    category.parent_id = category_data.parent_id
    db.commit()
    db.refresh(category)
    
    logger.info(f"Fault category updated: {category.name}")
    return category


@router.delete("/fault-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fault_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a fault category. Admin only.
    
    Args:
        category_id: The category ID
        db: Database session
        current_user: The authenticated admin
    """
    category = db.query(FaultCategory).filter(
        FaultCategory.id == category_id,
        FaultCategory.is_deleted == False
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fault category not found"
        )
    
    # Also soft delete children
    db.query(FaultCategory).filter(
        FaultCategory.parent_id == category_id
    ).update({"is_deleted": True})
    
    category.is_deleted = True
    db.commit()
    
    logger.info(f"Fault category deleted: {category.name}")


# ============ Repair Statuses (處理狀況) ============

@router.get("/repair-statuses", response_model=List[RepairStatusResponse])
async def list_repair_statuses(
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    List all repair statuses.
    All authenticated users can view statuses.
    
    Args:
        db: Database session
        current_user: The authenticated user
        
    Returns:
        List of repair statuses
    """
    statuses = db.query(RepairStatus).filter(RepairStatus.is_deleted == False).all()
    return statuses


@router.post("/repair-statuses", response_model=RepairStatusResponse, status_code=status.HTTP_201_CREATED)
async def create_repair_status(
    status_data: RepairStatusCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new repair status. Admin only.
    
    Args:
        status_data: Repair status creation data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Created repair status
        
    Raises:
        HTTPException: If status name already exists
    """
    # Check if name exists
    existing = db.query(RepairStatus).filter(
        RepairStatus.name == status_data.label
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repair status with this name already exists"
        )
    
    repair_status = RepairStatus(name=status_data.label, color=status_data.value)
    db.add(repair_status)
    db.commit()
    db.refresh(repair_status)
    
    logger.info(f"Repair status created: {repair_status.name}")
    return {"id": repair_status.id, "name": repair_status.name, "color": repair_status.color or "#888888"}


@router.put("/repair-statuses/{status_id}", response_model=RepairStatusResponse)
async def update_repair_status(
    status_id: int,
    status_data: RepairStatusCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Update a repair status. Admin only.
    
    Args:
        status_id: The status ID
        status_data: Update data
        db: Database session
        current_user: The authenticated admin
        
    Returns:
        Updated repair status
    """
    repair_status = db.query(RepairStatus).filter(
        RepairStatus.id == status_id,
        RepairStatus.is_deleted == False
    ).first()
    
    if not repair_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair status not found"
        )
    
    # Check if name exists (excluding current)
    existing = db.query(RepairStatus).filter(
        RepairStatus.name == status_data.label,
        RepairStatus.id != status_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repair status with this name already exists"
        )
    
    repair_status.name = status_data.label
    if status_data.value:
        repair_status.color = status_data.value
    db.commit()
    db.refresh(repair_status)
    
    logger.info(f"Repair status updated: {repair_status.name}")
    return {"id": repair_status.id, "name": repair_status.name, "color": repair_status.color or "#888888"}


@router.delete("/repair-statuses/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repair_status(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a repair status. Admin only.
    The "已存封" status is a system-protected status and cannot be deleted.
    
    Args:
        status_id: The status ID
        db: Database session
        current_user: The authenticated admin
    """
    repair_status = db.query(RepairStatus).filter(
        RepairStatus.id == status_id,
        RepairStatus.is_deleted == False
    ).first()
    
    if not repair_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair status not found"
        )
    
    # Protect "已存封" status from deletion
    if repair_status.name == "已存封":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無法刪除「已存封」狀態，這是系統保護狀態"
        )
    
    repair_status.is_deleted = True
    db.commit()
    
    logger.info(f"Repair status deleted: {repair_status.name}")
