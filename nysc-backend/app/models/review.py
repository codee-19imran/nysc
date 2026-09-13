import uuid
from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class ReviewDecision(str, enum.Enum):
    accepted = "accepted"
    rejected = "rejected"
    draft = "draft"  # ✅ NEW: Draft review

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id = Column(UUID(as_uuid=True), ForeignKey("papers.id"), nullable=False, index=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # --- Simplified Review Fields ---
    decision = Column(String(50), nullable=False)
    comments_for_authors = Column(Text, nullable=True)  # Visible to presenter
    confidential_comments = Column(Text, nullable=True)  # Only visible to admins
    
    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        Index('ix_review_paper', 'paper_id'),
        Index('ix_review_reviewer', 'reviewer_id'),
    )
