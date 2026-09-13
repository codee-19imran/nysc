import uuid
from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Text, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AnnouncementTarget(str, enum.Enum):
    all = "all"
    presenters = "presenters"
    unpaid = "unpaid"

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    target_audience = Column(Enum(AnnouncementTarget), nullable=False)
    
    # --- Metadata ---
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # --- Tracking ---
    recipient_count = Column(Integer, nullable=True)  # How many people received it

    __table_args__ = (
        Index('ix_announcement_sent_at', 'sent_at'),
    )
