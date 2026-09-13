import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class InquiryStatus(str, enum.Enum):
    new = "new"
    read = "read"
    replied = "replied"
    closed = "closed"

class InquirySubject(str, enum.Enum):
    general_inquiry = "general_inquiry"
    registration_support = "registration_support"
    paper_submission_issue = "paper_submission_issue"
    sponsorship_opportunities = "sponsorship_opportunities"
    technical_issue = "technical_issue"
    other = "other"

class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    subject = Column(Enum(InquirySubject), nullable=False)
    message = Column(Text, nullable=False)
    
    ip_address = Column(String(50), nullable=True)
    status = Column(Enum(InquiryStatus), default=InquiryStatus.new, nullable=False, index=True)
    
    admin_notes = Column(Text, nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
