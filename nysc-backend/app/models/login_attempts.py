import uuid
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class FailedLoginAttempt(Base):
    """Tracks failed login attempts for brute-force protection."""
    __tablename__ = "failed_login_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    identifier = Column(String(255), nullable=False, index=True)  # email or IP
    identifier_type = Column(String(20), nullable=False)  # 'email' or 'ip'
    attempt_count = Column(Integer, default=1, nullable=False)
    last_attempt_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
