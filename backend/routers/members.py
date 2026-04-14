"""
Members Router
Handles member/user management endpoints.
"""

import logging
from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Member, UserRole
from schemas import (
    MemberCreate, MemberUpdate, MemberResponse,
    LoginRequest, Token, PasswordChange
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_active_user, require_role, check_max_members,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/members", tags=["Members"])


@router.post("/register", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def register_member(
    member_data: MemberCreate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Register a new member. Only admins can create new members.

    Args:
        member_data: Member creation data
        db: Database session
        current_user: The authenticated admin user

    Returns:
        The created member

    Raises:
        HTTPException: If username already exists or max members reached
    """
    # Check if username exists
    if db.query(Member).filter(Member.username == member_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check max members limit
    if not check_max_members(db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of members ({5}) reached"
        )

    # Create member
    hashed_password = get_password_hash(member_data.password)
    member = Member(
        username=member_data.username,
        hashed_password=hashed_password,
        role=member_data.role
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    logger.info(f"New member registered: {member.username}")
    return member


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate a member and return a JWT token.

    Args:
        login_data: Login credentials
        db: Database session

    Returns:
        JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    member = db.query(Member).filter(
        Member.username == login_data.username,
        Member.is_deleted == False
    ).first()

    if not member or not verify_password(login_data.password, member.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not member.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": member.id, "username": member.username, "role": member.role},
        expires_delta=access_token_expires
    )

    logger.info(f"User logged in: {member.username}")
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=MemberResponse)
async def get_current_member_info(
    current_user: Member = Depends(get_current_active_user)
):
    """
    Get current member's information.

    Args:
        current_user: The authenticated member

    Returns:
        Current member's information
    """
    return current_user


@router.get("/", response_model=List[MemberResponse])
async def list_members(
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    List all members. Admin only.

    Args:
        db: Database session
        current_user: The authenticated admin

    Returns:
        List of all members
    """
    members = db.query(Member).filter(Member.is_deleted == False).all()
    return members


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Get a specific member's information.

    Args:
        member_id: The member ID
        db: Database session
        current_user: The authenticated member

    Returns:
        Member's information

    Raises:
        HTTPException: If not authorized or member not found
    """
    # Only admins can view other members
    if current_user.role != UserRole.ADMIN and current_user.id != member_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this member"
        )

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_deleted == False
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    return member


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: int,
    member_data: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Update a member. Admin only.

    Args:
        member_id: The member ID to update
        member_data: Update data
        db: Database session
        current_user: The authenticated admin

    Returns:
        Updated member

    Raises:
        HTTPException: If member not found or validation error
    """
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_deleted == False
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    # Update fields
    if member_data.password is not None:
        member.hashed_password = get_password_hash(member_data.password)

    if member_data.role is not None:
        member.role = member_data.role

    if member_data.is_active is not None:
        member.is_active = member_data.is_active

    db.commit()
    db.refresh(member)

    logger.info(f"Member updated: {member.username}")
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Soft delete a member. Admin only.

    Args:
        member_id: The member ID to delete
        db: Database session
        current_user: The authenticated admin

    Raises:
        HTTPException: If member not found or trying to delete self
    """
    if current_user.id == member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_deleted == False
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    # Soft delete
    from datetime import datetime
    member.is_deleted = True
    member.is_active = False

    db.commit()

    logger.info(f"Member deleted: {member.username}")


@router.post("/{member_id}/restore", response_model=MemberResponse)
async def restore_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: Member = Depends(require_role(UserRole.ADMIN))
):
    """
    Restore a soft-deleted member. Admin only.

    Args:
        member_id: The member ID to restore
        db: Database session
        current_user: The authenticated admin

    Returns:
        Restored member

    Raises:
        HTTPException: If member not found
    """
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_deleted == True
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deleted member not found"
        )

    member.is_deleted = False
    member.is_active = True

    db.commit()
    db.refresh(member)

    logger.info(f"Member restored: {member.username}")
    return member


@router.put("/{member_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_member_password(
    member_id: int,
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: Member = Depends(get_current_active_user)
):
    """
    Change a member's password.

    - Members can change their own password (requires old_password verification).
    - Admins can reset any member's password (no old_password needed).

    Args:
        member_id: The member ID whose password to change
        password_data: Password change data
        db: Database session
        current_user: The authenticated member

    Raises:
        HTTPException: If not authorized, member not found, or old password incorrect
    """
    # Authorization: admin can change any, user can only change their own
    if current_user.role != UserRole.ADMIN and current_user.id != member_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to change this member's password"
        )

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_deleted == False
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    # Non-admin (user changing own password): verify old password
    if current_user.role != UserRole.ADMIN:
        if not password_data.old_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Old password is required"
            )
        if not verify_password(password_data.old_password, member.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect old password"
            )

    # Update password
    member.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    logger.info(f"Password changed for member: {member.username}")
