import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.models.paper import PaperStatus, PaperDomain
from app.models.review import ReviewDecision


class PaperOut(BaseModel):
    """Reviewer-safe view — deliberately excludes author identity for double-blind review."""
    id: uuid.UUID
    title: str
    domain: Optional[str] = None
    abstract: Optional[str] = None
    file_url: Optional[str] = None
    review_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuthorInfo(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str


class PaperAdminOut(PaperOut):
    """Full view for admins/track chairs — includes author identities."""
    registration_id: uuid.UUID
    assigned_reviewer_id: Optional[uuid.UUID] = None
    decision: Optional[str] = None
    comments_for_authors: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    authors: List[AuthorInfo] = []


class AssignReviewersRequest(BaseModel):
    reviewer_id: uuid.UUID


class ReviewSubmitRequest(BaseModel):
    decision: ReviewDecision
    comments_for_authors: Optional[str] = None
    confidential_comments: Optional[str] = None


class ReviewOut(BaseModel):
    id: uuid.UUID
    paper_id: uuid.UUID
    reviewer_id: uuid.UUID
    decision: ReviewDecision
    comments_for_authors: Optional[str] = None
    confidential_comments: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaperStatusUpdate(BaseModel):
    status: str
