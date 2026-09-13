import uuid
from datetime import datetime
from sqlalchemy import Column, Enum, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class MealType(str, enum.Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"

class MealClaim(Base):
    __tablename__ = "meal_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("registrations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    meal_type = Column(Enum(MealType), nullable=False)
    claimed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scanned_by_volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # THE ZERO LOOPHOLE CONSTRAINT: 
    # A registration can only claim a specific meal_type ONCE.
    __table_args__ = (
        UniqueConstraint('registration_id', 'meal_type', name='uq_registration_meal'),
        Index('ix_meal_claim_reg', 'registration_id', 'meal_type'),
    )

    # relationships
    # registration = relationship("Registration", back_populates="meal_claims")
    # volunteer = relationship("User", foreign_keys=[scanned_by_volunteer_id])