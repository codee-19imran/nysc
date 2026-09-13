from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import logging
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User
from app.models.media import (
    PublicityTask, MediaArchiveItem, SocialMediaPost, PressNote,
    PublicityTaskStatus, SocialPostStatus, PressNoteStatus
)
from app.schemas.media import (
    PublicityTaskCreate, PublicityTaskUpdate, PublicityTaskResponse,
    MediaArchiveItemCreate, MediaArchiveItemUpdate, MediaArchiveItemResponse,
    SocialMediaPostCreate, SocialMediaPostUpdate, SocialMediaPostResponse,
    PressNoteCreate, PressNoteUpdate, PressNoteResponse,
    MediaStatsResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/media", tags=["media"])


# ============ STATS ============

@router.get("/stats", response_model=MediaStatsResponse)
@limiter.limit("100/minute")
@require_permission("media:view")
async def get_media_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get media dashboard statistics."""
    publicity_total = db.query(PublicityTask).filter(PublicityTask.is_deleted == False).count()
    publicity_completed = db.query(PublicityTask).filter(
        PublicityTask.is_deleted == False,
        PublicityTask.status == PublicityTaskStatus.completed
    ).count()
    
    media_total = db.query(MediaArchiveItem).filter(MediaArchiveItem.is_deleted == False).count()
    
    social_total = db.query(SocialMediaPost).filter(SocialMediaPost.is_deleted == False).count()
    social_published = db.query(SocialMediaPost).filter(
        SocialMediaPost.is_deleted == False,
        SocialMediaPost.status == SocialPostStatus.published
    ).count()
    
    press_total = db.query(PressNote).filter(PressNote.is_deleted == False).count()
    press_issued = db.query(PressNote).filter(
        PressNote.is_deleted == False,
        PressNote.status == PressNoteStatus.issued
    ).count()
    
    return MediaStatsResponse(
        publicity_tasks_total=publicity_total,
        publicity_tasks_completed=publicity_completed,
        media_items_total=media_total,
        social_posts_total=social_total,
        social_posts_published=social_published,
        press_notes_total=press_total,
        press_notes_issued=press_issued
    )


# ============ PUBLICITY TASKS ============

@router.get("/publicity", response_model=List[PublicityTaskResponse])
@limiter.limit("100/minute")
@require_permission("media:publicity")
async def get_publicity_tasks(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all publicity tasks."""
    query = db.query(PublicityTask).filter(PublicityTask.is_deleted == False)
    if status_filter and status_filter != 'all':
        query = query.filter(PublicityTask.status == status_filter)
    return query.order_by(desc(PublicityTask.created_at)).all()


@router.post("/publicity", response_model=PublicityTaskResponse)
@limiter.limit("30/minute")
@require_permission("media:publicity")
async def create_publicity_task(
    payload: PublicityTaskCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new publicity task."""
    task = PublicityTask(**payload.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    
    log_action(db, current_user, "publicity_task_created", "publicity_task", task.id,
               {"name": task.name}, request.client.host if request.client else None)
    
    return task


@router.put("/publicity/{task_id}", response_model=PublicityTaskResponse)
@limiter.limit("60/minute")
@require_permission("media:publicity")
async def update_publicity_task(
    task_id: uuid.UUID,
    payload: PublicityTaskUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a publicity task."""
    task = db.query(PublicityTask).filter(PublicityTask.id == task_id, PublicityTask.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(task, key, value)
    
    db.commit()
    db.refresh(task)
    return task


@router.delete("/publicity/{task_id}")
@limiter.limit("30/minute")
@require_permission("media:publicity")
async def delete_publicity_task(
    task_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a publicity task (soft)."""
    task = db.query(PublicityTask).filter(PublicityTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_deleted = True
    db.commit()
    return {"message": "Task deleted"}


# ============ MEDIA ARCHIVE ============

@router.get("/archive", response_model=List[MediaArchiveItemResponse])
@limiter.limit("100/minute")
@require_permission("media:archive")
async def get_media_archive(
    request: Request,
    media_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all media archive items."""
    query = db.query(MediaArchiveItem).filter(MediaArchiveItem.is_deleted == False)
    if media_type and media_type != 'all':
        query = query.filter(MediaArchiveItem.media_type == media_type)
    return query.order_by(desc(MediaArchiveItem.date_captured)).all()


@router.post("/archive", response_model=MediaArchiveItemResponse)
@limiter.limit("30/minute")
@require_permission("media:archive")
async def create_media_item(
    payload: MediaArchiveItemCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new media archive item."""
    item = MediaArchiveItem(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    
    log_action(db, current_user, "media_item_created", "media_item", item.id,
               {"title": item.title}, request.client.host if request.client else None)
    
    return item


@router.put("/archive/{item_id}", response_model=MediaArchiveItemResponse)
@limiter.limit("60/minute")
@require_permission("media:archive")
async def update_media_item(
    item_id: uuid.UUID,
    payload: MediaArchiveItemUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a media archive item."""
    item = db.query(MediaArchiveItem).filter(MediaArchiveItem.id == item_id, MediaArchiveItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/archive/{item_id}")
@limiter.limit("30/minute")
@require_permission("media:archive")
async def delete_media_item(
    item_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a media archive item (soft)."""
    item = db.query(MediaArchiveItem).filter(MediaArchiveItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.is_deleted = True
    db.commit()
    return {"message": "Item deleted"}


# ============ SOCIAL MEDIA ============

@router.get("/social", response_model=List[SocialMediaPostResponse])
@limiter.limit("100/minute")
@require_permission("media:social")
async def get_social_posts(
    request: Request,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all social media posts."""
    query = db.query(SocialMediaPost).filter(SocialMediaPost.is_deleted == False)
    if platform and platform != 'all':
        query = query.filter(SocialMediaPost.platform == platform)
    return query.order_by(desc(SocialMediaPost.created_at)).all()


@router.post("/social", response_model=SocialMediaPostResponse)
@limiter.limit("30/minute")
@require_permission("media:social")
async def create_social_post(
    payload: SocialMediaPostCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new social media post."""
    post = SocialMediaPost(**payload.dict())
    db.add(post)
    db.commit()
    db.refresh(post)
    
    log_action(db, current_user, "social_post_created", "social_post", post.id,
               {"platform": post.platform.value}, request.client.host if request.client else None)
    
    return post


@router.put("/social/{post_id}", response_model=SocialMediaPostResponse)
@limiter.limit("60/minute")
@require_permission("media:social")
async def update_social_post(
    post_id: uuid.UUID,
    payload: SocialMediaPostUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a social media post."""
    post = db.query(SocialMediaPost).filter(SocialMediaPost.id == post_id, SocialMediaPost.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(post, key, value)
    
    db.commit()
    db.refresh(post)
    return post


@router.delete("/social/{post_id}")
@limiter.limit("30/minute")
@require_permission("media:social")
async def delete_social_post(
    post_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a social media post (soft)."""
    post = db.query(SocialMediaPost).filter(SocialMediaPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post.is_deleted = True
    db.commit()
    return {"message": "Post deleted"}


# ============ PRESS NOTES ============

@router.get("/press", response_model=List[PressNoteResponse])
@limiter.limit("100/minute")
@require_permission("media:press")
async def get_press_notes(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all press notes."""
    return db.query(PressNote).filter(PressNote.is_deleted == False).order_by(desc(PressNote.created_at)).all()


@router.post("/press", response_model=PressNoteResponse)
@limiter.limit("30/minute")
@require_permission("media:press")
async def create_press_note(
    payload: PressNoteCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new press note."""
    note = PressNote(**payload.dict())
    db.add(note)
    db.commit()
    db.refresh(note)
    
    log_action(db, current_user, "press_note_created", "press_note", note.id,
               {"title": note.title}, request.client.host if request.client else None)
    
    return note


@router.put("/press/{note_id}", response_model=PressNoteResponse)
@limiter.limit("60/minute")
@require_permission("media:press")
async def update_press_note(
    note_id: uuid.UUID,
    payload: PressNoteUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a press note."""
    note = db.query(PressNote).filter(PressNote.id == note_id, PressNote.is_deleted == False).first()
    if not note:
        raise HTTPException(status_code=404, detail="Press note not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(note, key, value)
    
    db.commit()
    db.refresh(note)
    return note


@router.delete("/press/{note_id}")
@limiter.limit("30/minute")
@require_permission("media:press")
async def delete_press_note(
    note_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a press note (soft)."""
    note = db.query(PressNote).filter(PressNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Press note not found")
    
    note.is_deleted = True
    db.commit()
    return {"message": "Press note deleted"}


# ============ SEED PRE-LOADED DATA ============

@router.post("/seed")
@limiter.limit("1/minute")
@require_permission("media:publicity")
async def seed_media_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Seed pre-loaded media data. Run once."""
    if db.query(PublicityTask).count() > 0:
        return {"message": "Data already seeded", "skipped": True}
    
    # --- 5 Publicity Tasks ---
    tasks_data = [
        {"name": "Design Conference Poster", "description": "Create main conference poster with theme, dates, venue",
         "status": "completed", "notes": "Final design approved by committee"},
        {"name": "Print Banners for Venue", "description": "Print 10 banners for entrance, halls, and stage",
         "status": "in_progress", "notes": "Vendor confirmed, delivery by Dec 15"},
        {"name": "Outreach to Local Schools", "description": "Contact 15 schools within 50km radius",
         "status": "in_progress", "notes": "8 schools contacted so far"},
        {"name": "Design Brochure", "description": "Create 4-page brochure with conference details",
         "status": "pending", "notes": "Waiting for final speaker list"},
        {"name": "Social Media Campaign", "description": "Launch 30-day social media campaign",
         "status": "pending", "notes": "Content calendar prepared"},
    ]
    
    for t_data in tasks_data:
        task = PublicityTask(**t_data)
        db.add(task)
    
    # --- 3 Media Archive Items ---
    media_data = [
        {"title": "Inauguration Ceremony Photos", "media_type": "photo",
         "event_name": "Inauguration", "tags": "ceremony,inauguration,official",
         "file_reference": "/static/media/inauguration_2026.zip"},
        {"title": "Keynote Session Recording", "media_type": "video",
         "event_name": "Keynote Session", "tags": "keynote,video,recording",
         "file_reference": "/static/media/keynote_video.mp4"},
        {"title": "Group Photo - All Participants", "media_type": "photo",
         "event_name": "Closing Ceremony", "tags": "group,participants,closing",
         "file_reference": "/static/media/group_photo.jpg"},
    ]
    
    for m_data in media_data:
        item = MediaArchiveItem(**m_data)
        db.add(item)
    
    # --- 3 Social Media Posts ---
    social_data = [
        {"platform": "twitter", "content": "🎓 NYSC-2026 registration is now open! Join India's premier youth science conference. #NYSC2026 #Science",
         "status": "published"},
        {"platform": "instagram", "content": "📢 Call for Papers! Submit your research to NYSC-2026. Deadline: Nov 30. Link in bio. 🔬",
         "status": "scheduled"},
        {"platform": "linkedin", "content": "Excited to announce NYSC-2026! A national platform for young scientists to showcase their work. Register now!",
         "status": "draft"},
    ]
    
    for s_data in social_data:
        post = SocialMediaPost(**s_data)
        db.add(post)
    
    # --- 2 Press Notes ---
    press_data = [
        {"title": "NYSC-2026 Conference Announced",
         "content": "Central University of Karnataka is proud to announce the National Youth Science Conference 2026...",
         "target_media": "The Hindu, Indian Express, Times of India",
         "status": "issued"},
        {"title": "Call for Papers - NYSC-2026",
         "content": "Young researchers are invited to submit papers for NYSC-2026 in three domains...",
         "target_media": "University websites, Science magazines, Research portals",
         "status": "draft"},
    ]
    
    for p_data in press_data:
        note = PressNote(**p_data)
        db.add(note)
    
    db.commit()
    
    log_action(db, current_user, "media_data_seeded", "system", None,
               {"tasks": 5, "media": 3, "social": 3, "press": 2},
               request.client.host if request.client else None)
    
    return {
        "message": "Media data seeded successfully",
        "counts": {"tasks": 5, "media": 3, "social": 3, "press": 2}
    }
