import uuid
from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Text, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class PaperStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    accepted = "accepted"
    rejected = "rejected"

class PaperDomain(str, enum.Enum):
    mining = "Mining & Earth Observation"
    renewable = "Renewable Energy & Sustainability"
    environmental = "Environmental Science & Climate"

class Paper(Base):
    __tablename__ = "papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("registrations.id"), nullable=False, index=True)
    
    # --- Paper Metadata ---
    title = Column(String(500), nullable=False)
    abstract = Column(Text, nullable=True)  # ✅ Ensure this exists
    domain = Column(String(100), nullable=True)  # Changed from Enum to String for flexibility
    assigned_reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # --- File & Status ---
    file_url = Column(String(500), nullable=True)
    review_status = Column(String(50), default="submitted", nullable=False, index=True)
    decision = Column(String(50), nullable=True)
    comments_for_authors = Column(Text, nullable=True)
    
    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index('ix_paper_domain', 'domain'),
        Index('ix_paper_status', 'review_status'),
        Index('ix_paper_reviewer', 'assigned_reviewer_id'),
    )

class CoAuthor(Base):
    __tablename__ = "co_authors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    paper_id = Column(UUID(as_uuid=True), ForeignKey("papers.id"), nullable=False, index=True)
    email = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
