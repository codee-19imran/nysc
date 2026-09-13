from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

class CreateInviteRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    role: str  # One of the role names
    specialized_domain: Optional[str] = None
    custom_permissions: Optional[List[str]] = None  # List of permission names (optional override)

class InviteResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    role: str
    specialized_domain: Optional[str] = None
    status: str
    token: Optional[str] = None  # Only shown when first created
    invite_url: Optional[str] = None  # Full URL for sharing
    created_at: datetime
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_by_email: Optional[str] = None
    
    class Config:
        from_attributes = True

class ValidateInviteResponse(BaseModel):
    valid: bool
    invite: Optional[dict] = None
    error: Optional[str] = None

class AcceptInviteRequest(BaseModel):
    password: str = Field(..., min_length=8)
    confirm_password: str

class AdminSummary(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    role: str
    specialized_domain: Optional[str] = None
    is_active: int
    has_custom_permissions: bool
    permission_count: int
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UpdatePermissionsRequest(BaseModel):
    permissions: List[str]  # List of permission names to grant
    reset_to_role_defaults: bool = False  # If True, remove custom permissions
