from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, date
import uuid
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.registration import Registration, PaymentStatus
from app.models.paper import Paper, PaperStatus
from app.models.meal import MealClaim
from app.models.staff_attendance import StaffAttendance
from app.models.hospitality import (
    ParticipantMaterialCollection, MaterialType, HelpDeskRequest, HelpDeskStatus
)
from app.models.id_card import IdCard
from app.models.technical import TechnicalSession, SessionPaper
from app.models.website import WebsiteNews, PageStatus
from app.schemas.delegate import (
    DashboardOverview, ScheduleItem, IdCardStatus,
    MealRecord, MaterialRecord, HelpRequest, HelpRequestCreate,
    AnnouncementItem
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/delegate", tags=["delegate"])


# ============ OVERVIEW ============

@router.get("/overview")
@limiter.limit("100/minute")
async def get_dashboard_overview(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get delegate dashboard overview stats."""
    reg = db.query(Registration).filter(Registration.user_id == current_user.id).first()
    
    # Check-in status
    today = datetime.utcnow().date()
    checked_in_today = db.query(StaffAttendance).filter(
        StaffAttendance.user_id == current_user.id,
        StaffAttendance.scanned_at >= datetime.combine(today, datetime.min.time())
    ).first() is not None
    
    # Meals today
    meals_today = db.query(MealClaim).filter(
        MealClaim.user_id == current_user.id,
        MealClaim.claimed_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    # Materials collected
    materials_collected = 0
    materials_total = 0
    if reg:
        materials_collected = db.query(ParticipantMaterialCollection).filter(
            ParticipantMaterialCollection.registration_id == reg.id
        ).count()
        materials_total = db.query(MaterialType).count()
    
    # ID card status
    id_card = db.query(IdCard).filter(
        IdCard.user_id == current_user.id,
        IdCard.is_deleted == False
    ).first()
    
    next_session = None
    paper = None
    if reg:
        paper = db.query(Paper).filter(
            Paper.registration_id == reg.id,
            Paper.review_status == PaperStatus.accepted
        ).first()
    
    if paper:
        session_link = db.query(SessionPaper).filter(SessionPaper.paper_id == paper.id).first()
        if session_link:
            session = db.query(TechnicalSession).filter(
                TechnicalSession.id == session_link.session_id
            ).first()
            if session:
                next_session = {
                    "name": session.name,
                    "date": session.date.isoformat() if session.date else None,
                    "time_slot": session.time_slot,
                    "room": session.room_id
                }
    
    # Latest announcements
    announcements = db.query(WebsiteNews).filter(
        WebsiteNews.status == PageStatus.published
    ).order_by(desc(WebsiteNews.created_at)).limit(5).all()
    
    return {
        "user_name": current_user.name,
        "user_role": current_user.role.value,
        "category": reg.category if reg else None,
        "checked_in_today": checked_in_today,
        "meals_today": len(meals_today),
        "materials_collected": materials_collected,
        "materials_total": materials_total,
        "id_card_status": id_card.print_status.value if id_card else "not_generated",
        "next_session": next_session,
        "announcements": [{
            "id": str(a.id),
            "title": a.title,
            "category": a.category.value,
            "created_at": a.created_at.isoformat()
        } for a in announcements]
    }


# ============ SCHEDULE ============

@router.get("/schedule")
@limiter.limit("100/minute")
async def get_my_schedule(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized schedule (sessions where user is presenting)."""
    # Get user's accepted papers
    reg = db.query(Registration).filter(Registration.user_id == current_user.id).first()
    papers = []
    if reg:
        papers = db.query(Paper).filter(
            Paper.registration_id == reg.id,
            Paper.review_status == PaperStatus.accepted
        ).all()
    
    my_sessions = []
    for paper in papers:
        session_link = db.query(SessionPaper).filter(SessionPaper.paper_id == paper.id).first()
        if session_link:
            session = db.query(TechnicalSession).filter(
                TechnicalSession.id == session_link.session_id
            ).first()
            if session:
                my_sessions.append({
                    "session_id": str(session.id),
                    "session_name": session.name,
                    "session_type": session.session_type.value,
                    "date": session.date.isoformat() if session.date else None,
                    "time_slot": session.time_slot,
                    "room_id": str(session.room_id) if session.room_id else None,
                    "paper_title": paper.title,
                    "paper_id": str(paper.id),
                    "presentation_order": session_link.presentation_order,
                    "is_my_presentation": True
                })
    
    # Get all public sessions (for general schedule)
    all_sessions = db.query(TechnicalSession).filter(
        TechnicalSession.status != 'cancelled'
    ).order_by(TechnicalSession.date, TechnicalSession.time_slot).all()
    
    all_schedule = []
    for s in all_sessions:
        is_my_presentation = any(ms['session_id'] == str(s.id) for ms in my_sessions)
        all_schedule.append({
            "session_id": str(s.id),
            "session_name": s.name,
            "session_type": s.session_type.value,
            "date": s.date.isoformat() if s.date else None,
            "time_slot": s.time_slot,
            "room_id": str(s.room_id) if s.room_id else None,
            "is_my_presentation": is_my_presentation
        })
    
    return {
        "my_presentations": my_sessions,
        "all_sessions": all_schedule
    }


# ============ ID CARD ============

@router.get("/id-card-status")
@limiter.limit("100/minute")
async def get_id_card_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ID card status."""
    id_card = db.query(IdCard).filter(
        IdCard.user_id == current_user.id,
        IdCard.is_deleted == False
    ).first()
    
    if not id_card:
        return {
            "generated": False,
            "status": "not_generated",
            "message": "Your ID card will be generated on your first check-in at the venue"
        }
    
    return {
        "generated": True,
        "status": id_card.print_status.value,
        "generated_at": id_card.generated_at.isoformat(),
        "pdf_url": f"/{id_card.pdf_path}"
    }


@router.get("/id-card/download")
@limiter.limit("30/minute")
async def download_id_card(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download own ID card."""
    from fastapi.responses import FileResponse
    import os
    
    id_card = db.query(IdCard).filter(
        IdCard.user_id == current_user.id,
        IdCard.is_deleted == False
    ).first()
    
    if not id_card or not os.path.exists(id_card.pdf_path):
        raise HTTPException(status_code=404, detail="ID card not found")
    
    return FileResponse(
        id_card.pdf_path,
        media_type='application/pdf',
        filename=f"my_id_card.pdf"
    )


# ============ MEALS ============

@router.get("/my-meals")
@limiter.limit("100/minute")
async def get_my_meals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meals claimed by delegate."""
    meals = db.query(MealClaim).filter(
        MealClaim.user_id == current_user.id
    ).order_by(desc(MealClaim.claimed_at)).all()
    
    return [{
        "id": str(m.id),
        "meal_type": m.meal_type,
        "claimed_at": m.claimed_at.isoformat()
    } for m in meals]


# ============ MATERIALS ============

@router.get("/my-materials")
@limiter.limit("100/minute")
async def get_my_materials(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get materials collected by delegate."""
    reg = db.query(Registration).filter(Registration.user_id == current_user.id).first()
    if not reg:
        return {"collected": [], "available": []}
    
    # Collected materials
    collected_ids = [c.material_type_id for c in db.query(ParticipantMaterialCollection).filter(
        ParticipantMaterialCollection.registration_id == reg.id
    ).all()]
    
    all_materials = db.query(MaterialType).all()
    
    collected = []
    available = []
    for m in all_materials:
        item = {
            "id": str(m.id),
            "name": m.name,
            "description": m.description
        }
        if m.id in collected_ids:
            collected.append(item)
        else:
            available.append(item)
    
    return {"collected": collected, "available": available}


# ============ HELP DESK ============

@router.get("/helpdesk")
@limiter.limit("100/minute")
async def get_my_help_requests(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get help requests submitted by delegate."""
    requests = db.query(HelpDeskRequest).filter(
        HelpDeskRequest.requester_email == current_user.email
    ).order_by(desc(HelpDeskRequest.created_at)).all()
    
    return [{
        "id": str(r.id),
        "category": r.category.value,
        "priority": r.priority.value,
        "description": r.description,
        "status": r.status.value,
        "resolution_notes": r.resolution_notes,
        "created_at": r.created_at.isoformat()
    } for r in requests]


@router.post("/helpdesk")
@limiter.limit("10/hour")
async def submit_help_request(
    payload: HelpRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a help request."""
    help_request = HelpDeskRequest(
        requester_name=current_user.name,
        requester_email=current_user.email,
        requester_phone=current_user.phone,
        participant_category=payload.category,
        category=payload.category,
        priority=payload.priority,
        description=payload.description
    )
    db.add(help_request)
    db.commit()
    
    log_action(db, current_user, "help_request_submitted", "help_request", help_request.id,
               {"category": payload.category}, request.client.host if request.client else None)
    
    return {"message": "Help request submitted", "id": str(help_request.id)}


# ============ DOCUMENTS ============

@router.get("/my-documents")
@limiter.limit("100/minute")
async def get_my_documents(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's papers and certificates."""
    reg = db.query(Registration).filter(Registration.user_id == current_user.id).first()
    papers = []
    if reg:
        papers = db.query(Paper).filter(Paper.registration_id == reg.id).all()
    
    from app.models.paper import CoAuthor
    
    paper_list = []
    for p in papers:
        co_authors = db.query(CoAuthor).filter(CoAuthor.paper_id == p.id).all()
        paper_list.append({
            "id": str(p.id),
            "title": p.title,
            "domain": p.domain,
            "status": p.review_status.value if hasattr(p.review_status, 'value') else str(p.review_status),
            "has_file": bool(p.file_url),
            "co_authors": [c.email for c in co_authors],
            "submitted_at": p.created_at.isoformat() if hasattr(p, 'created_at') else None
        })
        
    return {
        "papers": paper_list
    }
