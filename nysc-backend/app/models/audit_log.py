import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # --- Action Details ---
    action = Column(String(100), nullable=False)  # e.g., "admin_created", "paper_reviewed", "user_deleted"
    target_type = Column(String(50), nullable=True)  # e.g., "user", "paper", "registration"
    target_id = Column(UUID(as_uuid=True), nullable=True)
    
    # --- What Changed ---
    details = Column(JSONB, nullable=True)  # Store what was changed as JSON
    
    # --- Timestamp (IMMUTABLE) ---
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # For security tracking

    __table_args__ = (
        Index('ix_audit_admin', 'admin_id'),
        Index('ix_audit_action', 'action'),
        Index('ix_audit_timestamp', 'timestamp'),
    )
