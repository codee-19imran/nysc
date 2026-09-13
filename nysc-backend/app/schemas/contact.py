from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
import uuid

class ContactInquiryCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    subject: str
    message: str = Field(..., min_length=10, max_length=2000)
    # Honeypot field to catch bots (should be empty)
    website: str = "" 

class ContactInquiryResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    subject: str
    message: str
    status: str
    admin_notes: Optional[str] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ContactInquiryUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
