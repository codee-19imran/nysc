import uuid
from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Integer, Index, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class InviteStatus(str, enum.Enum):
    pending = "pending"
    used = "used"
    expired = "expired"
    revoked = "revoked"

class AdminInvite(Base):
    __tablename__ = "admin_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    
    # ✅ NEW: Store the role
    role = Column(String(50), nullable=False, default="admin")  # admin, logistics_head, etc.
    
    specialized_domain = Column(String(100), nullable=True)  # For paper reviewers
    
    token = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(Enum(InviteStatus), default=InviteStatus.pending, nullable=False)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Store custom permissions as JSON (if any)
    details = Column(JSON, nullable=True)

    __table_args__ = (
        Index('ix_invite_token', 'token'),
        Index('ix_invite_status', 'status'),
        Index('ix_invite_email', 'email'),
        Index('ix_invite_role', 'role'),
    )
