from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


# ============ PAGES ============

class WebsitePageBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    status: str = "draft"
    order_index: int = 0


class WebsitePageCreate(WebsitePageBase):
    pass


class WebsitePageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    status: Optional[str] = None
    order_index: Optional[int] = None


class WebsitePageResponse(WebsitePageBase):
    id: uuid.UUID
    published_by_name: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ NEWS ============

class WebsiteNewsBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str
    category: str = "news"
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    is_featured: bool = False
    target_audience: str = "all"
    status: str = "draft"


class WebsiteNewsCreate(WebsiteNewsBase):
    pass


class WebsiteNewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    is_featured: Optional[bool] = None
    target_audience: Optional[str] = None
    status: Optional[str] = None


class WebsiteNewsResponse(WebsiteNewsBase):
    id: uuid.UUID
    created_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ FORMS ============

class FormFieldBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    field_type: str
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None
    order_index: int = 0


class FormFieldCreate(FormFieldBase):
    pass


class FormFieldResponse(FormFieldBase):
    id: uuid.UUID
    form_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class OnlineFormBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_audience: str = "all"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "draft"


class OnlineFormCreate(OnlineFormBase):
    pass


class OnlineFormUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None


class OnlineFormResponse(OnlineFormBase):
    id: uuid.UUID
    submission_count: int
    fields: List[FormFieldResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


class FormSubmissionResponse(BaseModel):
    id: uuid.UUID
    form_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    data: Dict[str, Any]
    submitted_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ COMMUNICATIONS ============

class DigitalCommunicationBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    body: str
    channel: str = "email"
    recipient_filter: str = "all"
    scheduled_at: Optional[datetime] = None


class DigitalCommunicationCreate(DigitalCommunicationBase):
    pass


class DigitalCommunicationUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    channel: Optional[str] = None
    recipient_filter: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None


class DigitalCommunicationResponse(DigitalCommunicationBase):
    id: uuid.UUID
    recipient_count: int
    sent_at: Optional[datetime] = None
    status: str
    success_count: int
    failed_count: int
    created_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ COORDINATION ============

class CoordinationRequestBase(BaseModel):
    from_department: str
    to_department: str
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    priority: str = "medium"
    status: str = "pending"
    notes: Optional[str] = None


class CoordinationRequestCreate(CoordinationRequestBase):
    pass


class CoordinationRequestUpdate(BaseModel):
    from_department: Optional[str] = None
    to_department: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CoordinationRequestResponse(CoordinationRequestBase):
    id: uuid.UUID
    created_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ STATS ============

class WebsiteStatsResponse(BaseModel):
    pages_published: int
    news_active: int
    total_registrations: int
    pending_registrations: int
    paid_registrations: int
    forms_active: int
    communications_sent_week: int
    total_form_submissions: int
    
    # NEW: Time-series and distribution data
    registration_trend: List[Dict[str, Any]] = []  # [{date, count}]
    payment_status_distribution: List[Dict[str, Any]] = []  # [{status, count}]
    form_submissions_distribution: List[Dict[str, Any]] = []  # [{form_name, count}]
    category_distribution: List[Dict[str, Any]] = []  # [{category, count}]
