import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PrintStatus(str, enum.Enum):
    pending = "pending"
    printed = "printed"
    collected = "collected"


class IdCardTemplate(Base):
    """Template configuration for ID cards per role."""
    __tablename__ = "id_card_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    target_role = Column(String(50), nullable=False, index=True)  # delegate, volunteer, staff, all
    template_image_path = Column(String(500), nullable=False)
    config = Column(JSON, nullable=False)  # Field positions, fonts, colors
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


class IdCard(Base):
    """Generated ID card record."""
    __tablename__ = "id_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("id_card_templates.id"), nullable=False)
    pdf_path = Column(String(500), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    print_status = Column(Enum(PrintStatus), default=PrintStatus.pending, nullable=False, index=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
