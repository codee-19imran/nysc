from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import csv
import io
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.registration import Registration, PaymentStatus
from app.models.payment import Payment
from app.models.paper import Paper
from app.models.review import Review
from app.models.website import (
    WebsitePage, WebsiteNews, OnlineForm, FormField, FormSubmission,
    DigitalCommunication, CoordinationRequest,
    PageStatus, NewsCategory, FormStatus, CommunicationStatus, CoordinationStatus
)
from app.schemas.website import (
    WebsitePageCreate, WebsitePageUpdate, WebsitePageResponse,
    WebsiteNewsCreate, WebsiteNewsUpdate, WebsiteNewsResponse,
    OnlineFormCreate, OnlineFormUpdate, OnlineFormResponse,
    FormFieldCreate, FormFieldResponse, FormSubmissionResponse,
    DigitalCommunicationCreate, DigitalCommunicationUpdate, DigitalCommunicationResponse,
    CoordinationRequestCreate, CoordinationRequestUpdate, CoordinationRequestResponse,
    WebsiteStatsResponse
)
from fastapi.responses import StreamingResponse

from app.core.email_tasks import queue_communication

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/website", tags=["website"])


# ============ STATS ============

@router.get("/stats", response_model=WebsiteStatsResponse)
@limiter.limit("100/minute")
@require_permission("website:view")
async def get_website_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get website dashboard statistics."""
    pages_published = db.query(WebsitePage).filter(WebsitePage.status == PageStatus.published).count()
    news_active = db.query(WebsiteNews).filter(WebsiteNews.status == PageStatus.published).count()
    
    total_registrations = db.query(Registration).count()
    pending_registrations = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.pending
    ).count()
    paid_registrations = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid
    ).count()
    
    forms_active = db.query(OnlineForm).filter(OnlineForm.status == FormStatus.active).count()
    
    week_ago = datetime.utcnow() - timedelta(days=7)
    communications_sent_week = db.query(DigitalCommunication).filter(
        DigitalCommunication.status == CommunicationStatus.sent,
        DigitalCommunication.sent_at >= week_ago
    ).count()
    
    total_form_submissions = db.query(FormSubmission).count()
    
    # NEW: Registration trend (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    registration_trend = db.query(
        cast(User.created_at, Date).label('date'),
        func.count(Registration.id).label('count')
    ).join(
        User, Registration.user_id == User.id
    ).filter(
        User.created_at >= thirty_days_ago
    ).group_by(
        cast(User.created_at, Date)
    ).order_by(
        cast(User.created_at, Date)
    ).all()
    
    registration_trend_data = [
        {"date": str(row.date), "count": row.count}
        for row in registration_trend
    ]
    
    # NEW: Payment status distribution
    payment_status_query = db.query(
        Registration.payment_status,
        func.count(Registration.id).label('count')
    ).group_by(Registration.payment_status).all()
    
    payment_status_data = [
        {"status": row.payment_status.value if hasattr(row.payment_status, 'value') else str(row.payment_status), 
         "count": row.count}
        for row in payment_status_query
    ]
    
    # NEW: Form submissions distribution
    form_submissions_data = []
    active_forms = db.query(OnlineForm).filter(OnlineForm.status == 'active').all()
    for form in active_forms:
        form_submissions_data.append({
            "form_name": form.name,
            "count": form.submission_count
        })
    
    # NEW: Category distribution
    category_query = db.query(
        Registration.category,
        func.count(Registration.id).label('count')
    ).filter(
        Registration.payment_status == 'paid'
    ).group_by(Registration.category).all()
    
    category_data = [
        {"category": row.category, "count": row.count}
        for row in category_query
    ]
    
    return WebsiteStatsResponse(
        pages_published=pages_published,
        news_active=news_active,
        total_registrations=total_registrations,
        pending_registrations=pending_registrations,
        paid_registrations=paid_registrations,
        forms_active=forms_active,
        communications_sent_week=communications_sent_week,
        total_form_submissions=total_form_submissions,
        registration_trend=registration_trend_data,
        payment_status_distribution=payment_status_data,
        form_submissions_distribution=form_submissions_data,
        category_distribution=category_data
    )


# ============ WEBSITE PAGES ============

@router.get("/pages", response_model=List[WebsitePageResponse])
@limiter.limit("100/minute")
@require_permission("website:content")
async def get_pages(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all website pages."""
    query = db.query(WebsitePage)
    if status_filter and status_filter != 'all':
        query = query.filter(WebsitePage.status == status_filter)
    
    pages = query.order_by(WebsitePage.order_index, WebsitePage.title).all()
    
    result = []
    for p in pages:
        published_by_name = None
        if p.published_by:
            publisher = db.query(User).filter(User.id == p.published_by).first()
            published_by_name = publisher.name if publisher else None
        
        result.append(WebsitePageResponse(
            id=p.id, title=p.title, slug=p.slug, content=p.content,
            meta_title=p.meta_title, meta_description=p.meta_description,
            status=p.status.value, order_index=p.order_index,
            published_by_name=published_by_name, published_at=p.published_at,
            created_at=p.created_at
        ))
    
    return result


@router.post("/pages", response_model=WebsitePageResponse)
@limiter.limit("30/minute")
@require_permission("website:content")
async def create_page(
    payload: WebsitePageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new website page."""
    # Check slug uniqueness
    existing = db.query(WebsitePage).filter(WebsitePage.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    page = WebsitePage(**payload.dict())
    if payload.status == 'published':
        page.published_by = current_user.id
        page.published_at = datetime.utcnow()
    
    db.add(page)
    db.commit()
    db.refresh(page)
    
    log_action(db, current_user, "website_page_created", "page", page.id,
               {"title": page.title, "slug": page.slug},
               request.client.host if request.client else None)
    
    return page


@router.put("/pages/{page_id}", response_model=WebsitePageResponse)
@limiter.limit("60/minute")
@require_permission("website:content")
async def update_page(
    page_id: uuid.UUID,
    payload: WebsitePageUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a website page."""
    page = db.query(WebsitePage).filter(WebsitePage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(page, key, value)
    
    if payload.status == 'published' and not page.published_at:
        page.published_by = current_user.id
        page.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(page)
    return page


@router.delete("/pages/{page_id}")
@limiter.limit("30/minute")
@require_permission("website:content")
async def delete_page(
    page_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a website page."""
    page = db.query(WebsitePage).filter(WebsitePage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    db.delete(page)
    db.commit()
    return {"message": "Page deleted"}


# ============ NEWS ============

@router.get("/news", response_model=List[WebsiteNewsResponse])
@limiter.limit("100/minute")
@require_permission("website:content")
async def get_news(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all news items."""
    news = db.query(WebsiteNews).order_by(desc(WebsiteNews.created_at)).all()
    
    result = []
    for n in news:
        created_by_name = None
        if n.created_by:
            creator = db.query(User).filter(User.id == n.created_by).first()
            created_by_name = creator.name if creator else None
        
        result.append(WebsiteNewsResponse(
            id=n.id, title=n.title, content=n.content,
            category=n.category.value, publish_date=n.publish_date,
            expiry_date=n.expiry_date, is_featured=n.is_featured,
            target_audience=n.target_audience, status=n.status.value,
            created_by_name=created_by_name, created_at=n.created_at
        ))
    
    return result


@router.post("/news", response_model=WebsiteNewsResponse)
@limiter.limit("30/minute")
@require_permission("website:content")
async def create_news(
    payload: WebsiteNewsCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a news item."""
    news = WebsiteNews(**payload.dict(), created_by=current_user.id)
    db.add(news)
    db.commit()
    db.refresh(news)
    return news


@router.put("/news/{news_id}", response_model=WebsiteNewsResponse)
@limiter.limit("60/minute")
@require_permission("website:content")
async def update_news(
    news_id: uuid.UUID,
    payload: WebsiteNewsUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a news item."""
    news = db.query(WebsiteNews).filter(WebsiteNews.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(news, key, value)
    
    db.commit()
    db.refresh(news)
    return news


@router.delete("/news/{news_id}")
@limiter.limit("30/minute")
@require_permission("website:content")
async def delete_news(
    news_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a news item."""
    news = db.query(WebsiteNews).filter(WebsiteNews.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    db.delete(news)
    db.commit()
    return {"message": "News deleted"}


# ============ REGISTRATIONS (READ-ONLY) ============

@router.get("/registrations")
@limiter.limit("100/minute")
@require_permission("website:registrations")
async def get_registrations(
    request: Request,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get registrations (read-only view for website head)."""
    query = db.query(Registration)
    
    if status_filter and status_filter != 'all':
        query = query.filter(Registration.payment_status == status_filter)
    if category and category != 'all':
        query = query.filter(Registration.category == category)
    
    # Updated: Registration model doesn't have created_at, removed order_by(Registration.created_at)
    registrations = query.limit(500).all()
    
    result = []
    for reg in registrations:
        user = db.query(User).filter(User.id == reg.user_id).first()
        if not user:
            continue
        
        result.append({
            "registration_id": str(reg.id),
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "category": reg.category,
            "payment_status": reg.payment_status.value if hasattr(reg.payment_status, 'value') else str(reg.payment_status),
            "registered_at": reg.created_at.isoformat() if hasattr(reg, 'created_at') else None,
            "reg_code": reg.reg_code if hasattr(reg, 'reg_code') else None
        })
    
    return result


# ============ PARTICIPANTS (No payment/paper data) ============

@router.get("/participants")
@limiter.limit("100/minute")
@require_permission("website:participants")
async def get_participants(
    request: Request,
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get participants (no payment/paper data — double-blind protection)."""
    query = db.query(User).filter(
        User.role.in_([UserRole.delegate, UserRole.presenter])
    )
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (User.name.ilike(search_term)) | (User.email.ilike(search_term))
        )
    
    users = query.order_by(desc(User.created_at)).limit(500).all()
    
    result = []
    for u in users:
        reg = db.query(Registration).filter(Registration.user_id == u.id).first()
        
        if category and category != 'all' and (not reg or reg.category != category):
            continue
        
        result.append({
            "user_id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "category": reg.category if reg else None,
            "registration_status": reg.payment_status.value if reg and hasattr(reg.payment_status, 'value') else None,
            "created_at": u.created_at.isoformat() if hasattr(u, 'created_at') else None
            # ❌ NO payment history
            # ❌ NO paper submissions
            # ❌ NO review records
        })
    
    return result


# ============ COMMUNICATIONS ============

@router.get("/communications", response_model=List[DigitalCommunicationResponse])
@limiter.limit("100/minute")
@require_permission("website:communications")
async def get_communications(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get communications log."""
    query = db.query(DigitalCommunication)
    if status_filter and status_filter != 'all':
        query = query.filter(DigitalCommunication.status == status_filter)
    
    comms = query.order_by(desc(DigitalCommunication.created_at)).all()
    
    result = []
    for c in comms:
        created_by_name = None
        if c.created_by:
            creator = db.query(User).filter(User.id == c.created_by).first()
            created_by_name = creator.name if creator else None
        
        result.append(DigitalCommunicationResponse(
            id=c.id, subject=c.subject, body=c.body,
            channel=c.channel.value, recipient_filter=c.recipient_filter,
            recipient_count=c.recipient_count, scheduled_at=c.scheduled_at,
            sent_at=c.sent_at, status=c.status.value,
            success_count=c.success_count, failed_count=c.failed_count,
            created_by_name=created_by_name, created_at=c.created_at
        ))
    
    return result


@router.post("/communications", response_model=DigitalCommunicationResponse)
@limiter.limit("30/minute")
@require_permission("website:communications")
async def create_communication(
    payload: DigitalCommunicationCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create and queue a communication for sending."""
    # Calculate recipient count
    if payload.recipient_filter == 'all':
        recipient_count = db.query(User).filter(
            User.role.in_([UserRole.delegate, UserRole.presenter])
        ).count()
    elif payload.recipient_filter in ['student', 'professional', 'accompanying']:
        recipient_count = db.query(Registration).filter(
            Registration.category == payload.recipient_filter
        ).count()
    else:
        recipient_count = 0
    
    comm = DigitalCommunication(
        **payload.dict(),
        created_by=current_user.id,
        recipient_count=recipient_count,
        status=CommunicationStatus.draft  # Start as draft
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)
    
    # Queue for background processing
    queue_communication(background_tasks, str(comm.id))
    
    log_action(db, current_user, "communication_queued", "communication", comm.id,
               {"subject": comm.subject, "recipients": recipient_count},
               request.client.host if request.client else None)
    
    return comm


@router.delete("/communications/{comm_id}")
@limiter.limit("30/minute")
@require_permission("website:communications")
async def delete_communication(
    comm_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a communication log."""
    comm = db.query(DigitalCommunication).filter(DigitalCommunication.id == comm_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")
    
    db.delete(comm)
    db.commit()
    return {"message": "Communication deleted"}


# ============ FORMS ============

@router.get("/forms", response_model=List[OnlineFormResponse])
@limiter.limit("100/minute")
@require_permission("website:forms")
async def get_forms(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all forms with fields."""
    forms = db.query(OnlineForm).order_by(desc(OnlineForm.created_at)).all()
    
    result = []
    for f in forms:
        fields = db.query(FormField).filter(FormField.form_id == f.id).order_by(FormField.order_index).all()
        
        result.append(OnlineFormResponse(
            id=f.id, name=f.name, description=f.description,
            target_audience=f.target_audience, start_date=f.start_date,
            end_date=f.end_date, status=f.status.value,
            submission_count=f.submission_count,
            fields=[FormFieldResponse.model_validate(field) for field in fields],
            created_at=f.created_at
        ))
    
    return result


@router.post("/forms", response_model=OnlineFormResponse)
@limiter.limit("30/minute")
@require_permission("website:forms")
async def create_form(
    payload: OnlineFormCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new form."""
    form = OnlineForm(**payload.dict(), created_by=current_user.id)
    db.add(form)
    db.commit()
    db.refresh(form)
    
    return OnlineFormResponse(
        id=form.id, name=form.name, description=form.description,
        target_audience=form.target_audience, start_date=form.start_date,
        end_date=form.end_date, status=form.status.value,
        submission_count=0, fields=[], created_at=form.created_at
    )


@router.post("/forms/{form_id}/fields", response_model=FormFieldResponse)
@limiter.limit("60/minute")
@require_permission("website:forms")
async def add_form_field(
    form_id: uuid.UUID,
    payload: FormFieldCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a field to a form."""
    form = db.query(OnlineForm).filter(OnlineForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    field = FormField(form_id=form_id, **payload.dict())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/forms/{form_id}/fields/{field_id}")
@limiter.limit("60/minute")
@require_permission("website:forms")
async def delete_form_field(
    form_id: uuid.UUID,
    field_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a form field."""
    field = db.query(FormField).filter(
        FormField.id == field_id, FormField.form_id == form_id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    db.delete(field)
    db.commit()
    return {"message": "Field deleted"}


@router.get("/forms/{form_id}/submissions", response_model=List[FormSubmissionResponse])
@limiter.limit("100/minute")
@require_permission("website:forms")
async def get_form_submissions(
    form_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get submissions for a form."""
    submissions = db.query(FormSubmission).filter(
        FormSubmission.form_id == form_id
    ).order_by(desc(FormSubmission.submitted_at)).all()
    
    result = []
    for s in submissions:
        user_name = None
        user_email = None
        if s.user_id:
            user = db.query(User).filter(User.id == s.user_id).first()
            if user:
                user_name = user.name
                user_email = user.email
        
        result.append(FormSubmissionResponse(
            id=s.id, form_id=s.form_id, user_id=s.user_id,
            data=s.data, submitted_at=s.submitted_at,
            user_name=user_name, user_email=user_email
        ))
    
    return result


@router.delete("/forms/{form_id}")
@limiter.limit("30/minute")
@require_permission("website:forms")
async def delete_form(
    form_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a form (cascades to fields and submissions)."""
    form = db.query(OnlineForm).filter(OnlineForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    db.delete(form)
    db.commit()
    return {"message": "Form deleted"}


# ============ COORDINATION ============

@router.get("/coordination", response_model=List[CoordinationRequestResponse])
@limiter.limit("100/minute")
@require_permission("website:view")
async def get_coordination_requests(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get coordination requests."""
    requests_list = db.query(CoordinationRequest).order_by(
        desc(CoordinationRequest.created_at)
    ).all()
    
    result = []
    for r in requests_list:
        created_by_name = None
        if r.created_by:
            creator = db.query(User).filter(User.id == r.created_by).first()
            created_by_name = creator.name if creator else None
        
        result.append(CoordinationRequestResponse(
            id=r.id, from_department=r.from_department,
            to_department=r.to_department, title=r.title,
            description=r.description, priority=r.priority,
            status=r.status.value, notes=r.notes,
            created_by_name=created_by_name, created_at=r.created_at
        ))
    
    return result


@router.post("/coordination", response_model=CoordinationRequestResponse)
@limiter.limit("30/minute")
@require_permission("website:view")
async def create_coordination_request(
    payload: CoordinationRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a coordination request."""
    req = CoordinationRequest(**payload.dict(), created_by=current_user.id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.put("/coordination/{request_id}", response_model=CoordinationRequestResponse)
@limiter.limit("60/minute")
@require_permission("website:view")
async def update_coordination_request(
    request_id: uuid.UUID,
    payload: CoordinationRequestUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a coordination request."""
    req = db.query(CoordinationRequest).filter(CoordinationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(req, key, value)
    
    db.commit()
    db.refresh(req)
    return req


@router.delete("/coordination/{request_id}")
@limiter.limit("30/minute")
@require_permission("website:view")
async def delete_coordination_request(
    request_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a coordination request."""
    req = db.query(CoordinationRequest).filter(CoordinationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db.delete(req)
    db.commit()
    return {"message": "Request deleted"}


# ============ SUPER ADMIN ONLY ENDPOINTS ============

@router.get("/payment-history")
@limiter.limit("100/minute")
@require_permission("website:payment_history")
async def get_payment_history(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history (Super Admin only)."""
    # Verify Super Admin
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    payments = db.query(Payment).order_by(desc(Payment.created_at)).limit(500).all()
    
    result = []
    for p in payments:
        registration = db.query(Registration).filter(Registration.id == p.registration_id).first()
        user = db.query(User).filter(User.id == registration.user_id).first() if registration else None
        result.append({
            "id": str(p.id),
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "amount": p.amount if hasattr(p, 'amount') else 0,
            "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
            "method": p.method if hasattr(p, 'method') else "unknown",
            "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') else None
        })
    
    return result


@router.get("/paper-submissions")
@limiter.limit("100/minute")
@require_permission("website:paper_submissions")
async def get_paper_submissions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paper submissions (Super Admin only)."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    papers = db.query(Paper).order_by(desc(Paper.created_at)).limit(500).all()
    
    from app.models.paper import CoAuthor
    
    result = []
    for p in papers:
        registration = db.query(Registration).filter(Registration.id == p.registration_id).first()
        user = db.query(User).filter(User.id == registration.user_id).first() if registration else None
        co_authors = db.query(CoAuthor).filter(CoAuthor.paper_id == p.id).all()
        
        result.append({
            "id": str(p.id),
            "title": p.title,
            "author_name": user.name if user else "Unknown",
            "author_email": user.email if user else "Unknown",
            "co_authors": [c.email for c in co_authors],
            "domain": p.domain if hasattr(p, 'domain') else None,
            "status": p.review_status.value if hasattr(p, 'review_status') and hasattr(p.review_status, 'value') else str(p.review_status),
            "submitted_at": p.created_at.isoformat() if hasattr(p, 'created_at') else None
        })
    
    return result


@router.get("/review-records")
@limiter.limit("100/minute")
@require_permission("website:review_records")
async def get_review_records(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get review records (Super Admin only, anonymized)."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    reviews = db.query(Review).order_by(desc(Review.created_at)).limit(500).all()
    
    result = []
    for r in reviews:
        paper = db.query(Paper).filter(Paper.id == r.paper_id).first()
        result.append({
            "id": str(r.id),
            "paper_title": paper.title if paper else "Unknown",
            "score": None,
            "recommendation": r.decision if hasattr(r, 'decision') else "Unknown",
            # ❌ NO reviewer identity (double-blind protection)
            "reviewer_id": "ANONYMOUS",
            "reviewed_at": r.created_at.isoformat() if hasattr(r, 'created_at') else None
        })
    
    return result


# ============ EXPORTS ============

@router.get("/export/participants")
@limiter.limit("10/minute")
@require_permission("website:export")
async def export_participants(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export participants (no payment/paper data)."""
    users = db.query(User).filter(
        User.role.in_([UserRole.delegate, UserRole.presenter])
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Category", "Registered At"])
    
    for u in users:
        reg = db.query(Registration).filter(Registration.user_id == u.id).first()
        writer.writerow([
            u.name, u.email, u.phone,
            reg.category if reg else "",
            u.created_at.strftime("%Y-%m-%d %H:%M") if hasattr(u, 'created_at') and u.created_at else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=participants.csv"}
    )


@router.get("/export/registrations")
@limiter.limit("10/minute")
@require_permission("website:export")
async def export_registrations(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export registrations."""
    registrations = db.query(Registration).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Category", "Status", "Registered At"])
    
    for reg in registrations:
        user = db.query(User).filter(User.id == reg.user_id).first()
        if user:
            writer.writerow([
                user.name, user.email, user.phone, reg.category,
                reg.payment_status.value if hasattr(reg.payment_status, 'value') else str(reg.payment_status),
                reg.created_at.strftime("%Y-%m-%d %H:%M") if hasattr(reg, 'created_at') and reg.created_at else ""
            ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registrations.csv"}
    )


@router.get("/export/communications")
@limiter.limit("10/minute")
@require_permission("website:export")
async def export_communications(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export communications log."""
    comms = db.query(DigitalCommunication).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Subject", "Channel", "Recipients", "Status", "Sent At", "Success", "Failed"])
    
    for c in comms:
        writer.writerow([
            c.subject, c.channel.value, c.recipient_count, c.status.value,
            c.sent_at.strftime("%Y-%m-%d %H:%M") if c.sent_at else "",
            c.success_count, c.failed_count
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=communications.csv"}
    )


@router.get("/export/forms/{form_id}")
@limiter.limit("10/minute")
@require_permission("website:export")
async def export_form_submissions(
    form_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export form submissions."""
    form = db.query(OnlineForm).filter(OnlineForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    submissions = db.query(FormSubmission).filter(FormSubmission.form_id == form_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    if submissions:
        # Get all field names from first submission
        headers = ["Submitted At", "User Name", "User Email"]
        if submissions[0].data:
            headers.extend(submissions[0].data.keys())
        writer.writerow(headers)
        
        for s in submissions:
            user_name = ""
            user_email = ""
            if s.user_id:
                user = db.query(User).filter(User.id == s.user_id).first()
                if user:
                    user_name = user.name
                    user_email = user.email
            
            row = [
                s.submitted_at.strftime("%Y-%m-%d %H:%M") if s.submitted_at else "",
                user_name, user_email
            ]
            if s.data:
                row.extend(s.data.values())
            writer.writerow(row)
    
    output.seek(0)
    safe_name = form.name.replace(' ', '_').lower()
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_submissions.csv"}
    )


@router.get("/export/website-content")
@limiter.limit("10/minute")
@require_permission("website:export")
async def export_website_content(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export website pages and news."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Type", "Title", "Slug/Category", "Status", "Created At"])
    
    pages = db.query(WebsitePage).all()
    for p in pages:
        writer.writerow(["Page", p.title, p.slug, p.status.value,
                        p.created_at.strftime("%Y-%m-%d %H:%M")])
    
    news = db.query(WebsiteNews).all()
    for n in news:
        writer.writerow(["News", n.title, n.category.value, n.status.value,
                        n.created_at.strftime("%Y-%m-%d %H:%M")])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=website_content.csv"}
    )


# ============ SEED PRE-LOADED DATA ============

@router.post("/seed")
@limiter.limit("1/minute")
@require_permission("website:content")
async def seed_website_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Seed pre-loaded website data. Run once."""
    if db.query(WebsitePage).count() > 0:
        return {"message": "Data already seeded", "skipped": True}
    
    # --- 7 Website Pages ---
    pages_data = [
        {"title": "Home", "slug": "home", "content": "Welcome to NYSC-2026...",
         "status": "published", "order_index": 1},
        {"title": "About Conference", "slug": "about", "content": "NYSC-2026 is a premier conference...",
         "status": "published", "order_index": 2},
        {"title": "Important Dates", "slug": "dates", "content": "Paper Submission Deadline: ...",
         "status": "published", "order_index": 3},
        {"title": "Registration", "slug": "registration", "content": "Register for NYSC-2026...",
         "status": "published", "order_index": 4},
        {"title": "Venue & Travel", "slug": "venue", "content": "The conference will be held at...",
         "status": "published", "order_index": 5},
        {"title": "Contact Us", "slug": "contact", "content": "Get in touch with us...",
         "status": "published", "order_index": 6},
        {"title": "FAQ", "slug": "faq", "content": "Frequently asked questions...",
         "status": "draft", "order_index": 7},
    ]
    
    for p_data in pages_data:
        page = WebsitePage(**p_data, published_by=current_user.id, published_at=datetime.utcnow())
        db.add(page)
    
    # --- 4 News Items ---
    news_data = [
        {"title": "NYSC-2026 Announced", "content": "We are pleased to announce...",
         "category": "announcement", "is_featured": True, "status": "published",
         "target_audience": "all"},
        {"title": "Paper Submission Portal Open", "content": "Authors can now submit...",
         "category": "announcement", "is_featured": True, "status": "published",
         "target_audience": "all"},
        {"title": "Early Bird Registration", "content": "Register before ... for discounted rates",
         "category": "news", "is_featured": False, "status": "published",
         "target_audience": "all"},
        {"title": "Keynote Speakers Announced", "content": "We are honored to welcome...",
         "category": "news", "is_featured": True, "status": "published",
         "target_audience": "all"},
    ]
    
    for n_data in news_data:
        news = WebsiteNews(**n_data, created_by=current_user.id)
        db.add(news)
    
    # --- 3 Online Forms ---
    feedback_form = OnlineForm(
        name="Post-Conference Feedback",
        description="Share your feedback about NYSC-2026",
        target_audience="registered",
        status="active",
        created_by=current_user.id
    )
    db.add(feedback_form)
    db.flush()
    
    feedback_fields = [
        {"form_id": feedback_form.id, "label": "Overall Satisfaction", "field_type": "radio",
         "required": True, "options": ["Excellent", "Good", "Average", "Poor"], "order_index": 1},
        {"form_id": feedback_form.id, "label": "Comments", "field_type": "textarea",
         "required": False, "order_index": 2},
        {"form_id": feedback_form.id, "label": "Would you attend again?", "field_type": "radio",
         "required": True, "options": ["Yes", "No", "Maybe"], "order_index": 3},
    ]
    for f in feedback_fields:
        db.add(FormField(**f))
    
    special_req_form = OnlineForm(
        name="Special Requirements",
        description="Let us know about any special requirements",
        target_audience="registered",
        status="active",
        created_by=current_user.id
    )
    db.add(special_req_form)
    db.flush()
    
    special_fields = [
        {"form_id": special_req_form.id, "label": "Dietary Requirements", "field_type": "dropdown",
         "required": False, "options": ["None", "Vegetarian", "Vegan", "Jain", "Gluten-free", "Other"],
         "order_index": 1},
        {"form_id": special_req_form.id, "label": "Accessibility Needs", "field_type": "textarea",
         "required": False, "order_index": 2},
    ]
    for f in special_fields:
        db.add(FormField(**f))
    
    workshop_form = OnlineForm(
        name="Workshop Registration",
        description="Register for pre-conference workshops",
        target_audience="registered",
        status="active",
        created_by=current_user.id
    )
    db.add(workshop_form)
    db.flush()
    
    workshop_fields = [
        {"form_id": workshop_form.id, "label": "Workshop Choice", "field_type": "dropdown",
         "required": True, "options": ["AI & Data Science", "Research Methodology", "Academic Writing"],
         "order_index": 1},
        {"form_id": workshop_form.id, "label": "Experience Level", "field_type": "radio",
         "required": True, "options": ["Beginner", "Intermediate", "Advanced"], "order_index": 2},
    ]
    for f in workshop_fields:
        db.add(FormField(**f))
    
    # --- 4 Coordination Requests ---
    coord_data = [
        {"from_department": "technical", "to_department": "website",
         "title": "Paper Status Updates Needed",
         "description": "Please share the list of accepted papers for the programme",
         "priority": "high", "status": "pending"},
        {"from_department": "media", "to_department": "website",
         "title": "Approved Content for Publicity",
         "description": "Need approved content for social media campaigns",
         "priority": "medium", "status": "pending"},
        {"from_department": "logistics", "to_department": "website",
         "title": "Final Participant Count",
         "description": "Need final participant count for venue planning",
         "priority": "high", "status": "pending"},
        {"from_department": "hospitality", "to_department": "website",
         "title": "Special Requirements List",
         "description": "Need list of participants with special dietary/accessibility needs",
         "priority": "medium", "status": "pending"},
    ]
    
    for c_data in coord_data:
        req = CoordinationRequest(**c_data, created_by=current_user.id)
        db.add(req)
    
    db.commit()
    
    log_action(db, current_user, "website_data_seeded", "system", None,
               {"pages": 7, "news": 4, "forms": 3, "coordination": 4},
               request.client.host if request.client else None)
    
    return {
        "message": "Website data seeded successfully",
        "counts": {"pages": 7, "news": 4, "forms": 3, "coordination": 4}
    }
