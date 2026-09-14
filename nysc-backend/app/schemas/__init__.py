"""
Pydantic Schemas for NYSC-2026 Conference API
Excludes paper fields from Registration, Includes Committee Role, Guest Slots
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRoleEnum(str, Enum):
    SUPER_USER = "super_user"
    ADMIN = "admin"
    HEAD_OF_WEBSITE = "head_of_website"
    COMMITTEE_MEMBER = "committee_member"
    VOLUNTEER = "volunteer"
    DELEGATE = "delegate"
    GUEST = "guest"

# === USER SCHEMAS ===
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRoleEnum = UserRoleEnum.DELEGATE

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    guest_slot_quota: int = 0
    guest_slots_used: int = 0
    template_preference: str = "default"
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    guest_slot_quota: Optional[int] = None
    extra_permissions: Optional[List[str]] = None
    template_preference: Optional[str] = None

# === REGISTRATION SCHEMAS (SIMPLIFIED) ===
class RegistrationBase(BaseModel):
    phone_number: str
    institution: str
    designation: str
    city: str
    state: str
    # REMOVED: field_of_study, stream, paper_details, co_authors

class RegistrationCreate(RegistrationBase):
    # Photo upload handled separately in multipart form
    pass

class RegistrationResponse(RegistrationBase):
    id: int
    user_id: int
    payment_status: str
    checked_in: bool
    check_in_time: Optional[datetime] = None
    id_card_generated: bool
    id_card_path: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class RegistrationPhotoUpload(BaseModel):
    photo_path: str

# === COMMITTEE INVITE SCHEMAS ===
class CommitteeInviteCreate(BaseModel):
    email: EmailStr
    role_assigned: UserRoleEnum = UserRoleEnum.COMMITTEE_MEMBER

class CommitteeInviteResponse(BaseModel):
    id: int
    email: str
    role_assigned: UserRoleEnum
    accepted: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# === MANUAL ID CARD SCHEMAS (GUEST) ===
class ManualIdCardCreate(BaseModel):
    guest_name: str
    guest_organization: Optional[str] = None
    invited_on_behalf_of: str

class ManualIdCardResponse(BaseModel):
    id: int
    guest_name: str
    guest_organization: Optional[str]
    invited_on_behalf_of: str
    qr_code_data: str
    generated_at: datetime
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

# === PAPER SUBMISSION SCHEMAS ===
class PaperSubmissionCreate(BaseModel):
    title: str
    abstract: Optional[str] = None

class PaperSubmissionResponse(BaseModel):
    id: int
    title: str
    abstract: Optional[str]
    status: str
    submitted_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PaperReviewUpdate(BaseModel):
    recommendation: str  # accept, reject, modify
    comments: str

# === ANNOUNCEMENT SCHEMAS ===
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    is_live: bool = False

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    is_live: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# === CONFERENCE SETTINGS SCHEMAS ===
class ConferenceSettingsUpdate(BaseModel):
    registration_deadline: Optional[datetime] = None
    paper_submission_deadline: Optional[datetime] = None
    meal_start_time: Optional[str] = None
    meal_end_time: Optional[str] = None

class ConferenceSettingsResponse(BaseModel):
    id: int
    registration_deadline: Optional[datetime] = None
    paper_submission_deadline: Optional[datetime] = None
    meal_start_time: str
    meal_end_time: str
    
    model_config = ConfigDict(from_attributes=True)

# === PAYMENT SCHEMAS (SUPER USER ONLY) ===
class PaymentResponse(BaseModel):
    id: int
    registration_id: int
    amount: float
    currency: str
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# === GALLERY SCHEMAS ===
class GalleryImageCreate(BaseModel):
    caption: Optional[str] = None
    category: str = "venue"
    display_order: int = 0

class GalleryImageResponse(BaseModel):
    id: int
    image_path: str
    caption: Optional[str]
    category: str
    display_order: int
    
    model_config = ConfigDict(from_attributes=True)

# === QR SCAN RESPONSE (FOR VOLUNTEER/COMMITTEE VERIFICATION) ===
class QRScanResult(BaseModel):
    user_id: int
    full_name: str
    role: UserRoleEnum
    photo_path: Optional[str]  # Visible only to scanner for verification
    checked_in: bool
    meal_eligible: bool  # Based on role (delegates restricted by timing)
    institution: str

# === LOGIN/TOKEN SCHEMAS ===
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRoleEnum] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
