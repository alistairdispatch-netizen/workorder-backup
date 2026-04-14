"""
ContractorUnits Router
Handles ContractorUnit (施工單位) CRUD operations with role-based access control.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import ContractorUnit, Member, UserRole
from schemas import (
    ContractorUnitCreate, ContractorUnitUpdate, ContractorUnitResponse
)
from auth import get_current_active_user

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contractor-units", tags=["ContractorUnits"])


@router.get("/", response_model=List[ContractorUnitResponse])
async def list_contractor_units(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    List all contractor units.
    - Admins: see all (including inactive if include_inactive=True)
    - Users/Guests: see active only

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        include_inactive: Include inactive records (admin only)
        db: Database session
        current_user: The authenticated user

    Returns:
        List of contractor units
    """
    query = db.query(ContractorUnit)

    if not include_inactive or current_user.role != UserRole.ADMIN:
        query = query.filter(ContractorUnit.is_active == True)

    units = query.order_by(ContractorUnit.sort_order, ContractorUnit.id).offset(skip).limit(limit).all()
    return units


@router.get("/{unit_id}", response_model=ContractorUnitResponse)
async def get_contractor_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Get a specific contractor unit.

    Args:
        unit_id: The contractor unit ID
        db: Database session
        current_user: The authenticated user

    Returns:
        Contractor unit details

    Raises:
        HTTPException: If not found
    """
    unit = db.query(ContractorUnit).filter(ContractorUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="施工單位不存在")
    if not unit.is_active and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="施工單位不存在")
    return unit


@router.post("/", response_model=ContractorUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_contractor_unit(
    data: ContractorUnitCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Create a new contractor unit. Admin only.

    Args:
        data: Contractor unit creation data
        db: Database session
        current_user: The authenticated admin

    Returns:
        The created contractor unit

    Raises:
        HTTPException: If name already exists or unauthorized
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="僅限管理員操作")

    # Check for duplicate name (including inactive)
    existing = db.query(ContractorUnit).filter(ContractorUnit.name == data.name).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="施工單位名稱已存在")

    # If setting as default, unset other defaults
    if data.is_default:
        db.query(ContractorUnit).filter(ContractorUnit.is_default == True).update({"is_default": False})

    unit = ContractorUnit(
        name=data.name,
        sort_order=data.sort_order or 0,
        is_default=data.is_default or False,
        is_active=True
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)

    logger.info(f"ContractorUnit created: {unit.name} by {current_user.username}")
    return unit


@router.put("/reorder")
async def reorder_contractor_units(
    ordered_ids: List[int],
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Reorder contractor units by updating sort_order for each id in the list.
    Admin only.
    """
    for idx, uid in enumerate(ordered_ids):
        unit = db.query(ContractorUnit).filter(ContractorUnit.id == uid).first()
        if unit:
            unit.sort_order = idx
    db.commit()
    return {"message": "Contractor units reordered"}


@router.put("/{unit_id}", response_model=ContractorUnitResponse)
async def update_contractor_unit(
    unit_id: int,
    data: ContractorUnitUpdate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Update a contractor unit. Admin only.

    Args:
        unit_id: The contractor unit ID
        data: Update data
        db: Database session
        current_user: The authenticated admin

    Returns:
        Updated contractor unit

    Raises:
        HTTPException: If not found, name conflicts, or unauthorized
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="僅限管理員操作")

    unit = db.query(ContractorUnit).filter(ContractorUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="施工單位不存在")

    # Check for duplicate name (excluding self)
    if data.name is not None and data.name != unit.name:
        existing = db.query(ContractorUnit).filter(
            ContractorUnit.name == data.name,
            ContractorUnit.id != unit_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="施工單位名稱已存在")

    # If setting as default, unset other defaults
    if data.is_default is True:
        db.query(ContractorUnit).filter(
            ContractorUnit.is_default == True,
            ContractorUnit.id != unit_id
        ).update({"is_default": False})

    # Update fields
    if data.name is not None:
        unit.name = data.name
    if data.sort_order is not None:
        unit.sort_order = data.sort_order
    if data.is_default is not None:
        unit.is_default = data.is_default
    if data.is_active is not None:
        unit.is_active = data.is_active

    db.commit()
    db.refresh(unit)

    logger.info(f"ContractorUnit updated: {unit.name} by {current_user.username}")
    return unit


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contractor_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Hard delete a contractor unit. Admin only.

    Args:
        unit_id: The contractor unit ID
        db: Database session
        current_user: The authenticated admin

    Raises:
        HTTPException: If not found or unauthorized
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="僅限管理員操作")

    unit = db.query(ContractorUnit).filter(ContractorUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="施工單位不存在")

    db.delete(unit)
    db.commit()

    logger.info(f"ContractorUnit hard deleted: {unit.name} by {current_user.username}")
