"""
Database Models - 工作管理系統
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class PhotoType(str, enum.Enum):
    BEFORE = "before"
    AFTER = "after"


class Member(Base):
    """會員（最多5人）"""
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="creator", foreign_keys="Order.created_by")


class Unit(Base):
    """單位（區處）"""
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    locations = relationship("Location", back_populates="unit")


class Location(Base):
    """地點（隸屬單位）"""
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    unit = relationship("Unit", back_populates="locations")


class FaultCategory(Base):
    """故障類別"""
    __tablename__ = "fault_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    items = Column(JSON, default=[])
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Status(Base):
    """處理狀況"""
    __tablename__ = "statuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    color = Column(String(20), default="#888888")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    """工單"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("members.id"), nullable=False)
    unit = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    fault_categories = Column(JSON, default=[])
    fault_description = Column(Text, nullable=False)
    treatment = Column(Text, nullable=True)
    contractor_unit_id = Column(Integer, ForeignKey("contractor_units.id"), nullable=True)
    archived_unit_id = Column(Integer, nullable=True)
    status = Column(String(50), default="待處理")
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    creator = relationship("Member", foreign_keys=[created_by], back_populates="orders")
    photos = relationship("Photo", back_populates="order", foreign_keys="Photo.order_id")
    contractor_unit = relationship("ContractorUnit", foreign_keys=[contractor_unit_id])


class ContractorUnit(Base):
    """施工單位"""
    __tablename__ = "contractor_units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    sort_order = Column(Integer, default=0)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="contractor_unit")


class Contractor(Base):
    """施工者（保留舊有，未來移除）"""
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    sort_order = Column(Integer, default=0)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Photo(Base):
    """照片（施工前後）"""
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    photo_type = Column(String(10), nullable=False)
    photo_number = Column(Integer, nullable=False)
    path = Column(String(500), nullable=False)
    version = Column(Integer, default=1)
    previous_version_id = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order")

class OrderFaultCategory(Base):
    """工單故障類別關聯"""
    __tablename__ = "order_fault_categories"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    fault_category_id = Column(Integer, ForeignKey("fault_categories.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    fault_category = relationship("FaultCategory")


# Alias for backward compatibility
RepairStatus = Status
OrderPhoto = Photo
