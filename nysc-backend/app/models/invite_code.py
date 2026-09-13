import uuid
import secrets
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class VolunteerInviteCode(Base):
    """Self-registration codes for volunteers."""
    __tablename__ = "volunteer_invite_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)  # e.g., "Host School Volunteers 2026"
    description = Column(String(500), nullable=True)
    
    # Controls
    max_uses = Column(Integer, default=100, nullable=False)
    current_uses = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Department assignment (optional)
    department = Column(String(50), nullable=True)  # logistics, technical, etc.
    
    # Audit
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
