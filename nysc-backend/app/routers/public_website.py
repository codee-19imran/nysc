from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.website import WebsitePage, WebsiteNews, OnlineForm, FormField, FormSubmission
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/public", tags=["public-website"])


# ============ PUBLIC PAGES ============

@router.get("/pages")
@limiter.limit("100/minute")
async def get_public_pages(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all published pages (public, no auth)."""
    pages = db.query(WebsitePage).filter(
        WebsitePage.status == 'published'
    ).order_by(WebsitePage.order_index).all()
    
    return [{
        "id": str(p.id),
        "title": p.title,
        "slug": p.slug,
        "meta_title": p.meta_title,
        "meta_description": p.meta_description,
        "order_index": p.order_index,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None
    } for p in pages]


@router.get("/pages/{slug}")
@limiter.limit("200/minute")
async def get_public_page(
    slug: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a single published page by slug (public)."""
    page = db.query(WebsitePage).filter(
        WebsitePage.slug == slug,
        WebsitePage.status == 'published'
    ).first()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {
        "id": str(page.id),
        "title": page.title,
        "slug": page.slug,
        "content": page.content,
        "meta_title": page.meta_title or page.title,
        "meta_description": page.meta_description or "",
        "published_at": page.published_at.isoformat() if page.published_at else None,
        "updated_at": page.updated_at.isoformat() if page.updated_at else None
    }


# ============ PUBLIC NEWS ============

@router.get("/news")
@limiter.limit("100/minute")
async def get_public_news(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get published news items (public)."""
    query = db.query(WebsiteNews).filter(
        WebsiteNews.status == 'published',
        (WebsiteNews.expiry_date.is_(None)) | (WebsiteNews.expiry_date > datetime.utcnow())
    )
    
    if category:
        query = query.filter(WebsiteNews.category == category)
    
    news = query.order_by(desc(WebsiteNews.publish_date), desc(WebsiteNews.is_featured), desc(WebsiteNews.created_at)) \
                .offset(offset).limit(limit).all()
    
    return [{
        "id": str(n.id),
        "title": n.title,
        "content": n.content,
        "category": n.category.value,
        "publish_date": n.publish_date.isoformat() if n.publish_date else n.created_at.isoformat(),
        "is_featured": n.is_featured,
        "target_audience": n.target_audience
    } for n in news]


@router.get("/news/featured")
@limiter.limit("100/minute")
async def get_featured_news(
    request: Request,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """Get featured news items (public)."""
    news = db.query(WebsiteNews).filter(
        WebsiteNews.status == 'published',
        WebsiteNews.is_featured == True,
        (WebsiteNews.expiry_date.is_(None)) | (WebsiteNews.expiry_date > datetime.utcnow())
    ).order_by(desc(WebsiteNews.publish_date)).limit(limit).all()
    
    return [{
        "id": str(n.id),
        "title": n.title,
        "content": n.content[:300] + "..." if len(n.content) > 300 else n.content,
        "category": n.category.value,
        "publish_date": n.publish_date.isoformat() if n.publish_date else n.created_at.isoformat()
    } for n in news]


# ============ PUBLIC FORMS ============

@router.get("/forms/{form_id}")
@limiter.limit("100/minute")
async def get_public_form(
    form_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a form for public submission."""
    form = db.query(OnlineForm).filter(OnlineForm.id == form_id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    if form.status != 'active':
        raise HTTPException(status_code=400, detail="Form is not currently accepting submissions")
    
    # Check date range
    now = datetime.utcnow()
    if form.start_date and now < form.start_date:
        raise HTTPException(status_code=400, detail="Form not yet open for submissions")
    if form.end_date and now > form.end_date:
        raise HTTPException(status_code=400, detail="Form submission period has ended")
    
    fields = db.query(FormField).filter(FormField.form_id == form.id).order_by(FormField.order_index).all()
    
    return {
        "id": str(form.id),
        "name": form.name,
        "description": form.description,
        "target_audience": form.target_audience,
        "fields": [{
            "id": str(f.id),
            "label": f.label,
            "field_type": f.field_type.value,
            "required": f.required,
            "placeholder": f.placeholder,
            "options": f.options,
            "order_index": f.order_index
        } for f in fields]
    }


from fastapi import UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict, Any

class FormSubmissionRequest(BaseModel):
    data: Dict[str, Any]
    user_email: Optional[str] = None

@router.post("/forms/{form_id}/submit")
@limiter.limit("20/hour")
async def submit_public_form(
    form_id: str,
    payload: FormSubmissionRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Submit a public form."""
    form = db.query(OnlineForm).filter(OnlineForm.id == form_id).first()
    if not form or form.status != 'active':
        raise HTTPException(status_code=400, detail="Form not accepting submissions")
    
    fields = db.query(FormField).filter(FormField.form_id == form.id).all()
    
    # Validate required fields
    for field in fields:
        if field.required and field.label not in payload.data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field.label}")
        if field.required and not payload.data.get(field.label):
            raise HTTPException(status_code=400, detail=f"Required field empty: {field.label}")
    
    # Find user if email provided
    user_id = None
    if payload.user_email:
        user = db.query(User).filter(User.email == payload.user_email).first()
        if user:
            user_id = user.id
    
    # Save submission
    submission = FormSubmission(
        form_id=form_id,
        user_id=user_id,
        data=payload.data,
        ip_address=request.client.host if request.client else None
    )
    db.add(submission)
    
    form.submission_count += 1
    db.commit()
    
    logger.info(f"Form submitted: {form.name} by {payload.user_email or 'anonymous'}")
    
    return {
        "message": "Form submitted successfully",
        "submission_id": str(submission.id)
    }
