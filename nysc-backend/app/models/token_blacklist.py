import uuid
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class BlacklistedToken(Base):
    """Stores revoked JWT tokens."""
    __tablename__ = "blacklisted_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    jti = Column(String(255), nullable=False, unique=True, index=True)  # JWT ID
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    token_type = Column(String(20), default="access")  # access or refresh
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reason = Column(String(100), default="logout")  # logout, password_change, admin_revoke
