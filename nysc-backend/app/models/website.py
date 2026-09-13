import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ============ ENUMS ============

class PageStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class NewsCategory(str, enum.Enum):
    announcement = "announcement"
    news = "news"
    update = "update"


class CommunicationChannel(str, enum.Enum):
    email = "email"
    in_app = "in_app"
    both = "both"


class CommunicationStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    sent = "sent"
    failed = "failed"


class FormFieldType(str, enum.Enum):
    text = "text"
    textarea = "textarea"
    dropdown = "dropdown"
    checkbox = "checkbox"
    radio = "radio"
    date = "date"
    file = "file"
    number = "number"
    email = "email"


class FormStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    closed = "closed"


class CoordinationStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    addressed = "addressed"


# ============ WEBSITE PAGES (CMS) ============

class WebsitePage(Base):
    __tablename__ = "website_pages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=True)
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)
    
    status = Column(Enum(PageStatus), default=PageStatus.draft, nullable=False, index=True)
    order_index = Column(Integer, default=0, nullable=False)
    
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ NEWS / UPDATES ============

class WebsiteNews(Base):
    __tablename__ = "website_news"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(Enum(NewsCategory), default=NewsCategory.news, nullable=False)
    
    publish_date = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    is_featured = Column(Boolean, default=False, nullable=False)
    target_audience = Column(String(50), default="all")  # all / registered / public
    
    status = Column(Enum(PageStatus), default=PageStatus.draft, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ ONLINE FORMS ============

class OnlineForm(Base):
    __tablename__ = "online_forms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_audience = Column(String(50), default="all")
    
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(Enum(FormStatus), default=FormStatus.draft, nullable=False)
    submission_count = Column(Integer, default=0, nullable=False)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


class FormField(Base):
    __tablename__ = "form_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    form_id = Column(UUID(as_uuid=True), ForeignKey("online_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    
    label = Column(String(255), nullable=False)
    field_type = Column(Enum(FormFieldType), nullable=False)
    required = Column(Boolean, default=False, nullable=False)
    placeholder = Column(String(255), nullable=True)
    options = Column(JSON, nullable=True)  # For dropdown/radio/checkbox
    order_index = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    form_id = Column(UUID(as_uuid=True), ForeignKey("online_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    data = Column(JSON, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip_address = Column(String(50), nullable=True)


# ============ COMMUNICATIONS ============

class DigitalCommunication(Base):
    __tablename__ = "digital_communications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    
    channel = Column(Enum(CommunicationChannel), default=CommunicationChannel.email, nullable=False)
    recipient_filter = Column(String(50), default="all")  # all / student / professional / custom
    recipient_count = Column(Integer, default=0)
    
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(Enum(CommunicationStatus), default=CommunicationStatus.draft, nullable=False)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ COORDINATION REQUESTS ============

class CoordinationRequest(Base):
    __tablename__ = "coordination_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    from_department = Column(String(50), nullable=False)  # technical, media, logistics, hospitality
    to_department = Column(String(50), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")  # low / medium / high / urgent
    
    status = Column(Enum(CoordinationStatus), default=CoordinationStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
