import uuid
from sqlalchemy import Column, String, Enum, Integer, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    logistics_head = "logistics_head"
    technical_head = "technical_head"
    hospitality_head = "hospitality_head"
    media_head = "media_head"
    website_head = "website_head"
    committee_member = "committee_member"  # ✅ NEW
    volunteer = "volunteer"
    presenter = "presenter"
    delegate = "delegate"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, index=True)
    specialized_domain = Column(String(100), nullable=True)
    is_active = Column(Integer, default=1, nullable=False)
    
    # ✅ NEW: QR code for attendance/meal tracking
    qr_hash = Column(String(255), unique=True, nullable=True, index=True)
    
    # ✅ NEW: Department assignment (for committee members)
    department = Column(String(50), nullable=True)  # logistics, technical, etc.
    assigned_by_head = Column(UUID(as_uuid=True), nullable=True)  # Who invited them
    
    # ✅ NEW: ID Card Fields
    id_card_generated = Column(Boolean, default=False, nullable=False, index=True)
    photo_path = Column(String(500), nullable=True)  # Optional user photo
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)