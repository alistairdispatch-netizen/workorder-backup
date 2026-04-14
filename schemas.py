"""
Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class PhotoType(str, Enum):
    BEFORE = "before"
    AFTER = "after"


# ─── Auth ───────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Member ─────────────────────────────────────
class MemberBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class MemberCreate(MemberBase):
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.USER


class MemberUpdate(BaseModel):
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class MemberResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: Optional[str] = Field(None, description="Old password (required for non-admin users changing own password)")
    new_password: str = Field(..., min_length=6, description="New password")


# ─── Unit ─────────────────────────────────────
class UnitBase(BaseModel):
    name: str = Field(..., max_length=100)


class UnitCreate(UnitBase):
    sort_order: Optional[int] = 0


class UnitUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class UnitResponse(UnitBase):
    id: int
    sort_order: int
    is_active: bool = True

    class Config:
        from_attributes = True


# ─── Location ─────────────────────────────────
class LocationBase(BaseModel):
    name: str = Field(..., max_length=100)


class LocationCreate(LocationBase):
    unit_id: int


class LocationResponse(LocationBase):
    id: int
    unit_id: int
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    unit_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ─── FaultCategory ─────────────────────────────
class FaultCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)


class FaultCategoryCreate(FaultCategoryBase):
    items: List[str] = []  # 子項目 JSON 陣列
    sort_order: Optional[int] = 0


class FaultCategoryResponse(FaultCategoryBase):
    id: int
    items: List[str]
    sort_order: int
    is_active: bool = True

    class Config:
        from_attributes = True


# ─── Status ───────────────────────────────────
class StatusBase(BaseModel):
    label: str = Field(..., max_length=100, alias="name")


class StatusCreate(StatusBase):
    value: Optional[str] = Field("#888888", alias="color")
    sort_order: Optional[int] = 0

    class Config:
        populate_by_name = True


class StatusResponse(StatusBase):
    id: int
    value: str = Field("#888888", alias="color")
    sort_order: int
    is_active: bool = True

    class Config:
        from_attributes = True
        populate_by_name = True


# ─── Contractor ────────────────────────────────
class ContractorBase(BaseModel):
    name: str = Field(..., max_length=100)


class ContractorCreate(ContractorBase):
    sort_order: Optional[int] = 0
    is_default: Optional[bool] = False


class ContractorResponse(ContractorBase):
    id: int
    sort_order: int
    is_default: bool = False
    is_active: bool = True

    class Config:
        from_attributes = True


# ─── Contractor Unit ──────────────────────────────
class ContractorUnitBase(BaseModel):
    name: str = Field(..., max_length=100)


class ContractorUnitCreate(ContractorUnitBase):
    sort_order: Optional[int] = 0
    is_default: Optional[bool] = False


class ContractorUnitUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class ContractorUnitResponse(ContractorUnitBase):
    id: int
    sort_order: int
    is_default: bool = False
    is_active: bool = True

    class Config:
        from_attributes: True


# ─── Settings ───────────────────────────────────
class SettingsResponse(BaseModel):
    units: List[UnitResponse]
    locations: List[LocationResponse]
    fault_categories: List[FaultCategoryResponse]
    repair_statuses: List[dict]
    max_members: int

    class Config:
        from_attributes = True


# ─── Order ────────────────────────────────────
class OrderListResponse(BaseModel):
    id: int
    order_number: str
    created_at: datetime
    creator_name: Optional[str] = None
    unit_name: Optional[str] = None
    location_name: Optional[str] = None
    fault_categories: List[str]
    fault_description: Optional[str] = None
    status_name: Optional[str] = None
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes: True


class OrderCreate(BaseModel):
    unit: str = Field(..., description="單位名稱")
    location: str = Field(..., description="地點名稱")
    fault_categories: List[str] = Field(default=[], description="故障類別名稱列表")
    fault_description: str
    treatment: Optional[str] = None
    contractor: Optional[str] = Field(None, description="施工者，管理者/使用者可見")
    contractor_unit_id: Optional[int] = None
    status: Optional[str] = Field("待處理", description="維修後狀態")


class OrderUpdate(BaseModel):
    unit: Optional[str] = None
    location: Optional[str] = None
    fault_categories: Optional[List[str]] = None
    fault_description: Optional[str] = None
    treatment: Optional[str] = None
    contractor: Optional[str] = None  # 使用者不可修改
    status: Optional[str] = None
    contractor_unit_id: Optional[int] = None


class OrderPhotoResponse(BaseModel):
    id: int
    photo_type: PhotoType
    photo_number: int
    path: str
    version: int
    created_at: datetime
    file_url: str = ""

    class Config:
        from_attributes = True


PhotoUploadResponse = OrderPhotoResponse

class OrderResponse(BaseModel):
    id: int
    order_number: str
    created_at: datetime
    created_by: int
    creator_name: Optional[str] = None
    unit: str
    unit_name: Optional[str] = None
    location: str
    location_name: Optional[str] = None
    fault_categories: List[str]
    fault_description: str
    treatment: Optional[str] = None
    contractor: Optional[str] = None
    status: Optional[str] = None
    contractor_unit_id: Optional[int] = None
    status_name: Optional[str] = None
    last_updated: Optional[datetime] = None
    is_deleted: bool
    photos: List[OrderPhotoResponse] = []

    class Config:
        from_attributes = True
