from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class AdminStatsResponse(BaseModel):
    total_registrations: int
    paid_registrations: int
    pending_registrations: int
    total_revenue: int
    papers_submitted: int
    papers_reviewed: int
    checkins_today: int

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    role: str
    category: Optional[str] = None
    institution: Optional[str] = None
    is_active: int
    
    class Config:
        from_attributes = True

class AdminPaperResponse(BaseModel):
    id: uuid.UUID
    title: str
    domain: Optional[str] = None
    review_status: str
    created_at: datetime
    primary_author_email: Optional[str] = None
    co_authors: Optional[List[str]] = []
    
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    admin_id: Optional[uuid.UUID] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[uuid.UUID] = None
    details: Optional[dict] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    admin_email: Optional[str] = None
    
    class Config:
        from_attributes = True

from pydantic import Field
from enum import Enum

class ReviewDecisionEnum(str, Enum):
    accepted = "accepted"
    rejected = "rejected"
    draft = "draft"  # ✅ NEW

class PaperDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    abstract: Optional[str] = None
    domain: Optional[str] = None
    review_status: str
    file_url: Optional[str] = None
    created_at: datetime
    comments_for_authors: Optional[str] = None
    decision: Optional[str] = None
    co_authors: Optional[List[str]] = []
    primary_author_email: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReviewSubmission(BaseModel):
    decision: ReviewDecisionEnum
    comments_for_authors: Optional[str] = Field(None, max_length=2000)
    confidential_comments: Optional[str] = Field(None, max_length=2000)

# ✅ NEW: For presenter to update paper metadata
class PaperMetadataUpdate(BaseModel):
    title: str = Field(..., min_length=10, max_length=500)
    abstract: Optional[str] = Field(None, max_length=3000)
    domain: Optional[str] = None
    co_author_emails: Optional[List[str]] = []

class PaymentResponse(BaseModel):
    id: uuid.UUID
    registration_id: uuid.UUID
    order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: int
    currency: str
    status: str
    created_at: datetime
    captured_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    
    class Config:
        from_attributes = True

class PaymentStatsResponse(BaseModel):
    total_revenue: int
    total_transactions: int
    successful: int
    pending: int
    failed: int
    refunded: int
    success_rate: float
    average_ticket: int

class ConferenceSettingsResponse(BaseModel):
    conference_dates: str
    venue: str
    student_fee: int
    professional_fee: int
    paper_submission_deadline: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    meal_timings: dict
    domains: List[str]
    important_dates: Optional[List[dict]] = None
    
    class Config:
        from_attributes = True

class ConferenceSettingsUpdate(BaseModel):
    conference_dates: Optional[str] = None
    venue: Optional[str] = None
    student_fee: Optional[int] = None
    professional_fee: Optional[int] = None
    paper_submission_deadline: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    meal_timings: Optional[dict] = None
    domains: Optional[List[str]] = None
    important_dates: Optional[List[dict]] = None
