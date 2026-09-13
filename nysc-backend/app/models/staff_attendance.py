import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class StaffAttendance(Base):
    """Tracks attendance for volunteers, committee members, and admins."""
    __tablename__ = "staff_attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    scanned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Self or another volunteer
