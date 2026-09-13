import uuid

from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # registration_desk/hospitality/technical/stage
    shift = Column(String, nullable=True)
    assigned_duty = Column(String, nullable=True)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("registrations.id"), nullable=False)
    scanned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())
