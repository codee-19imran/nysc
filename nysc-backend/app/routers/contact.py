from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.models.user import User, UserRole
from app.models.contact import ContactInquiry, InquiryStatus, InquirySubject
from app.schemas.contact import ContactInquiryCreate, ContactInquiryResponse, ContactInquiryUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["contact"])

# ============ PUBLIC ENDPOINT ============

@router.post("/public")
@limiter.limit("5/hour") # Rate limit: 5 submissions per hour per IP
async def submit_contact_inquiry(
    request: Request,
    payload: ContactInquiryCreate,
    db: Session = Depends(get_db)
):
    """Submit a contact form inquiry (Public, no auth)."""
    
    # 1. Honeypot check (catch bots)
    if payload.website:
        logger.warning(f"Bot detected from IP: {request.client.host}")
        return {"message": "Message sent successfully"} # Lie to the bot
    
    # 2. Save to database
    inquiry = ContactInquiry(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        subject=payload.subject,
        message=payload.message,
        ip_address=request.client.host if request.client else None
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    
    # 3. TODO: Email notification fallback
    # If SMTP is configured in the future, trigger email here.
    # For now, it safely just logs and returns success.
    logger.info(f"New contact inquiry from {payload.email}: {payload.subject}")
    
    return {"message": "Message sent successfully. We will reply within 24 hours."}


# ============ ADMIN ENDPOINTS ============

@router.get("/admin", response_model=List[ContactInquiryResponse])
@limiter.limit("100/minute")
@require_permission("page:overview") # Super Admin / Admin access
async def get_admin_inquiries(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all contact inquiries for admin dashboard."""
    query = db.query(ContactInquiry).filter(ContactInquiry.is_deleted == False)
    if status_filter and status_filter != 'all':
        query = query.filter(ContactInquiry.status == status_filter)
    
    return query.order_by(ContactInquiry.created_at.desc()).all()


@router.put("/admin/{inquiry_id}", response_model=ContactInquiryResponse)
@limiter.limit("60/minute")
@require_permission("page:overview")
async def update_inquiry(
    inquiry_id: uuid.UUID,
    payload: ContactInquiryUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update inquiry status or add admin notes."""
    inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(inquiry, key, value)
        
    # Auto-set responded_at if status changes to replied/closed
    if payload.status in ['replied', 'closed'] and not inquiry.responded_at:
        from datetime import datetime
        inquiry.responded_at = datetime.utcnow()
    
    db.commit()
    db.refresh(inquiry)
    return inquiry


@router.delete("/admin/{inquiry_id}")
@limiter.limit("30/minute")
@require_permission("page:overview")
async def delete_inquiry(
    inquiry_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete an inquiry."""
    inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    inquiry.is_deleted = True
    db.commit()
    return {"message": "Inquiry deleted"}


@router.get("/admin/stats")
@limiter.limit("100/minute")
@require_permission("page:overview")
async def get_contact_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get contact dashboard statistics."""
    total = db.query(ContactInquiry).filter(ContactInquiry.is_deleted == False).count()
    new_count = db.query(ContactInquiry).filter(
        ContactInquiry.is_deleted == False,
        ContactInquiry.status == InquiryStatus.new
    ).count()
    replied_count = db.query(ContactInquiry).filter(
        ContactInquiry.is_deleted == False,
        ContactInquiry.status == InquiryStatus.replied
    ).count()
    
    return {
        "total": total,
        "new": new_count,
        "replied": replied_count
    }
