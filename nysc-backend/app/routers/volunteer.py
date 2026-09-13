from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, time, timezone
from typing import Optional
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.core.config import settings
from app.services.qr_service import verify_qr_signature
from app.models.user import User, UserRole
from app.models.registration import Registration, PaymentStatus
from app.models.meal import MealClaim
from app.models.settings import ConferenceSettings
from app.models.venue import VenueTask, TaskStatus
from app.models.staff_attendance import StaffAttendance

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/volunteer", tags=["volunteer"])


# verify_qr_signature is imported from app.services.qr_service
# It hashes "{user_id}:{user_type}" which matches how QRs are generated.


def parse_meal_time(time_str: str) -> tuple[time, time]:
    """Parse meal timing string like '08:00-10:00' into start/end times."""
    try:
        start_str, end_str = time_str.split('-')
        start_parts = start_str.strip().split(':')
        end_parts = end_str.strip().split(':')
        start_time = time(int(start_parts[0]), int(start_parts[1]))
        end_time = time(int(end_parts[0]), int(end_parts[1]))
        return start_time, end_time
    except:
        return time(0, 0), time(23, 59)


# User types that use Registration table for check-in
DELEGATE_TYPES = ['delegate', 'presenter']

# User types that use StaffAttendance table
STAFF_TYPES = [
    'super_admin', 'admin', 'logistics_head', 'technical_head',
    'hospitality_head', 'media_head', 'website_head',
    'committee_member', 'volunteer'
]

# ============ UNIVERSAL SCAN ENDPOINTS ============

@router.post("/scan")
@limiter.limit("60/minute")
@require_permission("event:checkin")
async def smart_scan(
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    UNIVERSAL QR SCAN ENDPOINT
    Handles check-in for ANY user type (delegate, volunteer, admin, etc.)
    Automatically routes to correct table based on user_type in QR.
    """
    qr_data_raw = payload.get('qr_data')
    
    if not qr_data_raw:
        raise HTTPException(status_code=400, detail="Invalid QR code data")
    
    # Parse QR data
    import json
    try:
        qr_data = json.loads(qr_data_raw)
    except:
        raise HTTPException(status_code=400, detail="Invalid QR format")
    
    user_id = qr_data.get('user_id')
    user_type = qr_data.get('user_type')
    qr_hash = qr_data.get('qr_hash')
    
    if not all([user_id, user_type, qr_hash]):
        raise HTTPException(status_code=400, detail="Missing QR fields")
    
    # Verify signature — must pass user_type to match generation: hmac("{user_id}:{user_type}")
    if not verify_qr_signature(user_id, user_type, qr_hash):
        raise HTTPException(status_code=400, detail="Invalid QR signature")
    
    # Get the scanned user
    scanned_user = db.query(User).filter(User.id == user_id).first()
    if not scanned_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not scanned_user.is_active:
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    # Route based on user type
    if user_type in DELEGATE_TYPES:
        return _handle_delegate_checkin(db, scanned_user, current_user, request)
    elif user_type in STAFF_TYPES:
        return _handle_staff_checkin(db, scanned_user, current_user, request)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown user type: {user_type}")


def _handle_delegate_checkin(db, user, scanner, request):
    """Check in a delegate/presenter via Registration table."""
    registration = db.query(Registration).filter(Registration.user_id == user.id).first()
    
    if not registration:
        raise HTTPException(
            status_code=400,
            detail=f"No registration found for {user.email}. They may not have completed registration."
        )
    
    if registration.payment_status != PaymentStatus.paid:
        return {
            "status": "not_paid",
            "message": f"{user.name} has not completed payment yet",
            "user_name": user.name,
            "user_email": user.email,
            "user_type": user.role.value,
            "category": registration.category,
            "payment_status": registration.payment_status.value
        }
    
    today = datetime.now(timezone.utc).date()
    if registration.checked_in_at and registration.checked_in_at.date() == today:
        return {
            "status": "already_checked_in",
            "message": f"{user.name} already checked in today",
            "user_name": user.name,
            "user_email": user.email,
            "user_type": user.role.value,
            "category": registration.category,
            "checkin_time": registration.checked_in_at.isoformat()
        }
    
    registration.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    
    log_action(
        db, scanner, "attendee_checkin", "registration", registration.id,
        {"user_name": user.name, "user_type": user.role.value, "scanner": scanner.email},
        request.client.host if request.client else None
    )
    
    return {
        "status": "success",
        "message": f"Welcome, {user.name}!",
        "user_name": user.name,
        "user_email": user.email,
        "user_type": user.role.value,
        "category": registration.category,
        "checkin_time": registration.checked_in_at.isoformat()
    }


def _handle_staff_checkin(db, user, scanner, request):
    """Check in staff (volunteer/admin/head) via StaffAttendance table."""
    today = datetime.now(timezone.utc).date()
    
    existing = db.query(StaffAttendance).filter(
        StaffAttendance.user_id == user.id,
        StaffAttendance.scanned_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    ).first()
    
    if existing:
        return {
            "status": "already_checked_in",
            "message": f"{user.name} already checked in today",
            "user_name": user.name,
            "user_email": user.email,
            "user_type": user.role.value,
            "checkin_time": existing.scanned_at.isoformat()
        }
    
    record = StaffAttendance(
        user_id=user.id,
        scanned_by=scanner.id,
        location=request.client.host if request.client else None
    )
    db.add(record)
    db.commit()
    
    log_action(
        db, scanner, "staff_checkin", "user", user.id,
        {"user_name": user.name, "user_type": user.role.value, "scanner": scanner.email},
        request.client.host if request.client else None
    )
    
    return {
        "status": "success",
        "message": f"Welcome, {user.name}!",
        "user_name": user.name,
        "user_email": user.email,
        "user_type": user.role.value,
        "checkin_time": record.scanned_at.isoformat()
    }


@router.post("/scan-meal")
@limiter.limit("60/minute")
@require_permission("event:meal_scan")
async def smart_meal_scan(
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    UNIVERSAL MEAL SCAN ENDPOINT
    Handles meal claims for ANY user type.
    """
    qr_data_raw = payload.get('qr_data')
    meal_type = payload.get('meal_type')
    
    if not qr_data_raw or not meal_type:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    if meal_type not in ['breakfast', 'lunch', 'dinner']:
        raise HTTPException(status_code=400, detail="Invalid meal type")
    
    # Parse QR
    import json
    try:
        qr_data = json.loads(qr_data_raw)
    except:
        raise HTTPException(status_code=400, detail="Invalid QR format")
    
    user_id = qr_data.get('user_id')
    user_type = qr_data.get('user_type')
    qr_hash = qr_data.get('qr_hash')
    
    if not verify_qr_signature(user_id, user_type, qr_hash):
        raise HTTPException(status_code=400, detail="Invalid QR signature")
    
    scanned_user = db.query(User).filter(User.id == user_id).first()
    if not scanned_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get meal timing
    settings = db.query(ConferenceSettings).first()
    if not settings or not settings.meal_timings:
        raise HTTPException(status_code=500, detail="Meal timings not configured")
    
    meal_time_str = settings.meal_timings.get(meal_type)
    if not meal_time_str:
        raise HTTPException(status_code=400, detail=f"{meal_type} not configured")
    
    start_time, end_time = parse_meal_time(meal_time_str)
    now_time = datetime.now(timezone.utc).time()
    
    if not (start_time <= now_time <= end_time):
        return {
            "status": "wrong_time",
            "message": f"{meal_type.title()} is only served from {meal_time_str}",
            "meal_type": meal_type,
            "timing": meal_time_str,
            "user_name": scanned_user.name,
            "user_type": scanned_user.role.value
        }
    
    # Check existing claim
    today = datetime.now(timezone.utc).date()
    
    if user_type in DELEGATE_TYPES:
        # Delegate: check via registration_id
        registration = db.query(Registration).filter(Registration.user_id == user_id).first()
        if not registration:
            raise HTTPException(status_code=400, detail="No registration found")
        
        existing = db.query(MealClaim).filter(
            MealClaim.registration_id == registration.id,
            MealClaim.meal_type == meal_type,
            MealClaim.claimed_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
        ).first()
        
        if existing:
            return {
                "status": "already_claimed",
                "message": f"{scanned_user.name} already claimed {meal_type}",
                "user_name": scanned_user.name,
                "user_type": scanned_user.role.value,
                "claim_time": existing.claimed_at.isoformat()
            }
        
        claim = MealClaim(
            registration_id=registration.id,
            meal_type=meal_type,
            claimed_at=datetime.now(timezone.utc),
            scanned_by_volunteer_id=current_user.id
        )
    else:
        # Staff: check via user_id
        existing = db.query(MealClaim).filter(
            MealClaim.user_id == user_id,
            MealClaim.meal_type == meal_type,
            MealClaim.claimed_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
        ).first()
        
        if existing:
            return {
                "status": "already_claimed",
                "message": f"{scanned_user.name} already claimed {meal_type}",
                "user_name": scanned_user.name,
                "user_type": scanned_user.role.value,
                "claim_time": existing.claimed_at.isoformat()
            }
        
        claim = MealClaim(
            user_id=user_id,
            meal_type=meal_type,
            claimed_at=datetime.now(timezone.utc),
            scanned_by_volunteer_id=current_user.id
        )
    
    db.add(claim)
    db.commit()
    
    log_action(
        db, current_user, "meal_claimed", "user", user_id,
        {"user_name": scanned_user.name, "meal_type": meal_type, "user_type": user_type},
        request.client.host if request.client else None
    )
    
    return {
        "status": "success",
        "message": f"{meal_type.title()} claimed for {scanned_user.name}",
        "user_name": scanned_user.name,
        "user_email": scanned_user.email,
        "user_type": scanned_user.role.value,
        "meal_type": meal_type,
        "claim_time": claim.claimed_at.isoformat()
    }


# ============ LIVE STATS ENDPOINT ============

@router.get("/stats")
@limiter.limit("100/minute")
@require_permission("event:view_stats")
async def get_volunteer_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get live event statistics."""
    today = datetime.now(timezone.utc).date()
    
    # Check-ins today (from delegates)
    checkins_today = db.query(Registration).filter(
        Registration.checked_in_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    ).count()
    
    # Staff checkins today
    staff_checkins_today = db.query(StaffAttendance).filter(
        StaffAttendance.scanned_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    ).count()
    
    # Total registered
    total_registered = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid
    ).count()
    
    # Meals claimed today
    meals_today = db.query(MealClaim).filter(
        MealClaim.claimed_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    ).all()
    
    breakfast_count = len([m for m in meals_today if m.meal_type == 'breakfast'])
    lunch_count = len([m for m in meals_today if m.meal_type == 'lunch'])
    dinner_count = len([m for m in meals_today if m.meal_type == 'dinner'])
    
    return {
        "status": "success",
        "message": "Stats fetched",
        "attendance_rate": round(((checkins_today + staff_checkins_today) / max(total_registered, 1)) * 100, 1) if total_registered else 0,
        "checkins_today": checkins_today + staff_checkins_today,
        "total_registered": total_registered,
        "meals_today": {
            "breakfast": breakfast_count,
            "lunch": lunch_count,
            "dinner": dinner_count,
            "total": len(meals_today)
        }
    }


# ============ VOLUNTEER DASHBOARD ============

@router.get("/my-qr")
@limiter.limit("100/minute")
@require_permission("event:checkin")
async def get_my_qr(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get volunteer's personal QR data."""
    if not current_user.qr_hash:
        # Generate QR if missing
        from app.services.qr_service import generate_user_qr
        qr_hash, qr_path = generate_user_qr(str(current_user.id), current_user.role.value)
        current_user.qr_hash = qr_hash
        db.commit()
    
    import json
    qr_data = json.dumps({
        "user_id": str(current_user.id),
        "user_type": current_user.role.value,
        "qr_hash": current_user.qr_hash
    })
    
    return {
        "qr_data": qr_data,
        "qr_hash": current_user.qr_hash,
        "user_name": current_user.name,
        "user_email": current_user.email,
        "role": current_user.role.value,
        "department": current_user.department
    }


@router.get("/my-tasks")
@limiter.limit("100/minute")
@require_permission("event:checkin")
async def get_my_tasks(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to this volunteer."""
    tasks = db.query(VenueTask).filter(
        VenueTask.assigned_to == current_user.id
    ).order_by(VenueTask.deadline.asc().nullslast()).all()
    
    return [{
        "id": str(t.id),
        "task_name": t.task_name,
        "description": t.description,
        "category": t.category.value,
        "priority": t.priority.value,
        "status": t.status.value,
        "deadline": t.deadline.isoformat() if t.deadline else None,
        "notes": t.notes
    } for t in tasks]


@router.get("/my-attendance")
@limiter.limit("100/minute")
@require_permission("event:checkin")
async def get_my_attendance(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get volunteer's own attendance history."""
    records = db.query(StaffAttendance).filter(
        StaffAttendance.user_id == current_user.id
    ).order_by(StaffAttendance.scanned_at.desc()).limit(50).all()
    
    return [{
        "id": str(r.id),
        "scanned_at": r.scanned_at.isoformat(),
        "location": r.location
    } for r in records]


@router.post("/self-checkin")
@limiter.limit("10/minute")
@require_permission("event:checkin")
async def self_checkin(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Volunteer checks themselves in by scanning their own QR."""
    today = datetime.now(timezone.utc).date()
    
    # Check if already checked in today
    existing = db.query(StaffAttendance).filter(
        StaffAttendance.user_id == current_user.id,
        StaffAttendance.scanned_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    ).first()
    
    if existing:
        return {
            "status": "already_checked_in",
            "message": "You've already checked in today",
            "checkin_time": existing.scanned_at.isoformat()
        }
    
    # Create attendance record
    record = StaffAttendance(
        user_id=current_user.id,
        scanned_by=current_user.id  # Self check-in
    )
    db.add(record)
    db.commit()
    
    log_action(
        db, current_user, "staff_self_checkin", "user", current_user.id,
        {"name": current_user.name, "role": current_user.role.value},
        request.client.host if request.client else None
    )
    
    return {
        "status": "success",
        "message": f"Welcome, {current_user.name}!",
        "checkin_time": record.scanned_at.isoformat()
    }
