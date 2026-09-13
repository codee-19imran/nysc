import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "super_admin"
    description = Column(String(255), nullable=True)
    is_system_role = Column(Boolean, default=True, nullable=False)  # Cannot be deleted if True
