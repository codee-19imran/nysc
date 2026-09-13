import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ============ ENUMS ============

class PublicityTaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class MediaType(str, enum.Enum):
    photo = "photo"
    video = "video"


class SocialPlatform(str, enum.Enum):
    twitter = "twitter"
    instagram = "instagram"
    linkedin = "linkedin"
    facebook = "facebook"
    youtube = "youtube"


class SocialPostStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"


class PressNoteStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"


# ============ PUBLICITY TASKS ============

class PublicityTask(Base):
    __tablename__ = "publicity_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(PublicityTaskStatus), default=PublicityTaskStatus.pending, nullable=False)
    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ MEDIA ARCHIVE ============

class MediaArchiveItem(Base):
    __tablename__ = "media_archive_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    media_type = Column(Enum(MediaType), nullable=False)
    event_name = Column(String(255), nullable=True)
    date_captured = Column(Date, nullable=True)
    file_reference = Column(String(500), nullable=True)  # Path reference only
    tags = Column(String(500), nullable=True)  # Comma-separated keywords
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ SOCIAL MEDIA POSTS ============

class SocialMediaPost(Base):
    __tablename__ = "social_media_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    platform = Column(Enum(SocialPlatform), nullable=False)
    content = Column(Text, nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(SocialPostStatus), default=SocialPostStatus.draft, nullable=False)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ PRESS NOTES ============

class PressNote(Base):
    __tablename__ = "press_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    issue_date = Column(Date, nullable=True)
    target_media = Column(String(500), nullable=True)  # Comma-separated outlets
    status = Column(Enum(PressNoteStatus), default=PressNoteStatus.draft, nullable=False)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
