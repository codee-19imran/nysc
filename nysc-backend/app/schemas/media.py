from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
import uuid


# ============ PUBLICITY TASKS ============

class PublicityTaskBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "pending"
    due_date: Optional[date] = None
    notes: Optional[str] = None


class PublicityTaskCreate(PublicityTaskBase):
    pass


class PublicityTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class PublicityTaskResponse(PublicityTaskBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ MEDIA ARCHIVE ============

class MediaArchiveItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    media_type: str
    event_name: Optional[str] = None
    date_captured: Optional[date] = None
    file_reference: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None


class MediaArchiveItemCreate(MediaArchiveItemBase):
    pass


class MediaArchiveItemUpdate(BaseModel):
    title: Optional[str] = None
    media_type: Optional[str] = None
    event_name: Optional[str] = None
    date_captured: Optional[date] = None
    file_reference: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None


class MediaArchiveItemResponse(MediaArchiveItemBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ SOCIAL MEDIA ============

class SocialMediaPostBase(BaseModel):
    platform: str
    content: str
    scheduled_date: Optional[datetime] = None
    status: str = "draft"
    notes: Optional[str] = None


class SocialMediaPostCreate(SocialMediaPostBase):
    pass


class SocialMediaPostUpdate(BaseModel):
    platform: Optional[str] = None
    content: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SocialMediaPostResponse(SocialMediaPostBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ PRESS NOTES ============

class PressNoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str
    issue_date: Optional[date] = None
    target_media: Optional[str] = None
    status: str = "draft"
    notes: Optional[str] = None


class PressNoteCreate(PressNoteBase):
    pass


class PressNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    issue_date: Optional[date] = None
    target_media: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PressNoteResponse(PressNoteBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ STATS ============

class MediaStatsResponse(BaseModel):
    publicity_tasks_total: int
    publicity_tasks_completed: int
    media_items_total: int
    social_posts_total: int
    social_posts_published: int
    press_notes_total: int
    press_notes_issued: int
