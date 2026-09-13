import uuid
from sqlalchemy import Column, String, Enum, ForeignKey, Index, DateTime, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class ParticipationType(str, enum.Enum):
    attendee = "attendee"
    presenter = "presenter"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    category = Column(String(50), nullable=False)
    participation_type = Column(Enum(ParticipationType), nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False, index=True)
    
    # Expanded Registration Fields
    sub_category = Column(String, nullable=True)
    education_level = Column(String, nullable=True)
    student_class = Column(String, nullable=True)
    field_of_study = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    organization = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    experience = Column(Integer, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    paper_title = Column(String, nullable=True)
    co_authors = Column(JSON, nullable=True)
    accompanying_count = Column(Integer, default=0, nullable=True)
    
    # Secure Ticket Fields
    reg_code = Column(String(50), unique=True, nullable=True)
    qr_hash = Column(String(255), unique=True, nullable=True, index=True) # Indexed for instant volunteer scanning
    checked_in_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    # user = relationship("User", back_populates="registrations")
    # meal_claims = relationship("MealClaim", back_populates="registration")