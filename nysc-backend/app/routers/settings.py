from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User
from app.models.settings import ConferenceSettings
from app.schemas.admin import ConferenceSettingsResponse, ConferenceSettingsUpdate
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/public/important-dates")
@limiter.limit("100/minute")
async def get_public_important_dates(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get important dates for public display (no auth required)."""
    settings = db.query(ConferenceSettings).first()
    
    if not settings or not settings.important_dates:
        # Return default fallback dates if none configured
        return {
            "important_dates": [
                {"event": "Call for Papers Opens", "date": "January 1, 2026", "passed": True},
                {"event": "Paper Submission Deadline", "date": "March 15, 2026", "passed": False},
                {"event": "Notification of Acceptance", "date": "May 1, 2026", "passed": False},
                {"event": "Camera Ready Submission", "date": "June 1, 2026", "passed": False},
                {"event": "Early Bird Registration Ends", "date": "June 15, 2026", "passed": False},
                {"event": "Conference Dates", "date": "Dec 17-18, 2026", "passed": False}
            ]
        }
    
    return {"important_dates": settings.important_dates}

@router.get("/public/domains")
@limiter.limit("100/minute")
async def get_public_domains(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get paper domains for public display (no auth required)."""
    settings = db.query(ConferenceSettings).first()
    
    if not settings or not settings.domains:
        return {
            "domains": [
                "Mining & Earth Observation",
                "Renewable Energy & Sustainability",
                "Environmental Science & Climate"
            ]
        }
    
    return {"domains": settings.domains}


@router.get("/public/paper-deadline")
@limiter.limit("100/minute")
async def get_public_paper_deadline(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get paper submission deadline status for public display (no auth required)."""
    from app.services.deadline_service import check_paper_deadline
    status = check_paper_deadline(db)
    # Serialize datetime for JSON
    if status.get("deadline"):
        status["deadline"] = status["deadline"].isoformat()
    return status


@router.get("", response_model=ConferenceSettingsResponse)
@limiter.limit("100/minute")
@require_permission("settings:edit")
async def get_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conference settings."""
    settings = db.query(ConferenceSettings).first()
    if not settings:
        settings = ConferenceSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("")
@limiter.limit("30/minute")
@require_permission("settings:edit")
async def update_settings(
    payload: ConferenceSettingsUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conference settings."""
    settings = db.query(ConferenceSettings).first()
    if not settings:
        settings = ConferenceSettings()
        db.add(settings)

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    settings.updated_by = current_user.id
    db.commit()

    log_action(
        db=db,
        admin=current_user,
        action="settings_updated",
        target_type="settings",
        details={
            "changed_fields": list(payload.dict(exclude_unset=True).keys()),
            "changed_by": current_user.email
        },
        ip_address=request.client.host if request.client else None
    )

    logger.info(f"Admin {current_user.email} updated conference settings")
    return {"message": "Settings updated successfully"}


@router.get("/public/deadlines")
@limiter.limit("100/minute")
async def get_public_deadlines(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint — returns deadline status + countdown info.
    No authentication required.
    """
    settings = db.query(ConferenceSettings).first()
    now = datetime.now(timezone.utc)
    
    def build_deadline_info(deadline, name):
        if not deadline:
            return {
                "name": name,
                "status": "not_set",
                "deadline": None,
                "days_remaining": None,
                "hours_remaining": None,
                "message": f"{name} is open (no deadline set)"
            }
        
        if now > deadline:
            return {
                "name": name,
                "status": "closed",
                "deadline": deadline.isoformat(),
                "days_remaining": 0,
                "hours_remaining": 0,
                "message": f"{name} closed on {deadline.strftime('%B %d, %Y at %I:%M %p')}"
            }
        
        remaining = deadline - now
        days = remaining.days
        hours = (remaining.seconds // 3600) % 24
        minutes = (remaining.seconds // 60) % 60
        
        return {
            "name": name,
            "status": "open",
            "deadline": deadline.isoformat(),
            "days_remaining": days,
            "hours_remaining": hours,
            "minutes_remaining": minutes,
            "message": f"{name} closes in {days}d {hours}h {minutes}m"
        }
    
    return {
        "registration": build_deadline_info(
            settings.registration_deadline if settings else None,
            "Registration"
        ),
        "paper_submission": build_deadline_info(
            settings.paper_submission_deadline if settings else None,
            "Paper Submission"
        ),
        "server_time": now.isoformat()  # For client-side sync
    }


@router.post("/extend-deadline")
@limiter.limit("10/hour")
@require_permission("admin:manage")
async def extend_deadline(
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extend a deadline. Super Admin only.
    Payload: {"type": "registration" | "paper_submission", "new_deadline": "2026-06-20T23:59:00"}
    """
    if current_user.role.value != 'super_admin':
        raise HTTPException(status_code=403, detail="Only Super Admin can extend deadlines")
    
    deadline_type = payload.get("type")
    new_deadline_str = payload.get("new_deadline")
    
    if deadline_type not in ["registration", "paper_submission"]:
        raise HTTPException(status_code=400, detail="Invalid deadline type")
    
    if not new_deadline_str:
        raise HTTPException(status_code=400, detail="New deadline required")
    
    try:
        new_deadline = datetime.fromisoformat(new_deadline_str.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    settings = db.query(ConferenceSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    old_deadline = None
    if deadline_type == "registration":
        old_deadline = settings.registration_deadline
        settings.registration_deadline = new_deadline
    else:
        old_deadline = settings.paper_submission_deadline
        settings.paper_submission_deadline = new_deadline
    
    db.commit()
    
    log_action(
        db, current_user, "deadline_extended", "settings", settings.id,
        {
            "type": deadline_type,
            "old_deadline": old_deadline.isoformat() if old_deadline else None,
            "new_deadline": new_deadline.isoformat()
        },
        request.client.host if request.client else None
    )
    
    return {
        "message": f"{deadline_type} deadline extended",
        "new_deadline": new_deadline.isoformat()
    }
