from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, date, time, timezone
from typing import List, Optional
import csv
import io

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.models.user import User, UserRole
from app.models.registration import Registration
from app.models.meal import MealClaim
from app.services.qr_service import verify_qr_signature

router = APIRouter(prefix="/admin/attendance", tags=["attendance"])


@router.get("/delegates")
@limiter.limit("100/minute")
@require_permission("attendance:view_all")
async def get_delegate_attendance(
    request: Request,
    date_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get delegate attendance records."""
    query = db.query(Registration).filter(Registration.checked_in_at.isnot(None))
    
    if date_filter:
        target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        query = query.filter(func.date(Registration.checked_in_at) == target_date)
    
    registrations = query.order_by(desc(Registration.checked_in_at)).limit(500).all()
    
    result = []
    for reg in registrations:
        user = db.query(User).filter(User.id == reg.user_id).first()
        if user:
            result.append({
                "user_id": str(user.id),
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "category": reg.category,
                "participation_type": reg.participation_type,
                "checked_in_at": reg.checked_in_at.isoformat() if reg.checked_in_at else None,
                "reg_code": reg.reg_code
            })
    
    return result


@router.get("/volunteers")
@limiter.limit("100/minute")
@require_permission("attendance:view_all")
async def get_volunteer_attendance(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get volunteer attendance (based on QR scans they've performed)."""
    # Volunteers who have scanned QR codes today
    today = datetime.utcnow().date()
    
    # Get all volunteers
    volunteers = db.query(User).filter(
        User.role.in_([UserRole.volunteer, UserRole.committee_member])
    ).all()
    
    result = []
    for vol in volunteers:
        # Count scans performed by this volunteer today
        # (This would need a scan_logs table - simplified for now)
        result.append({
            "user_id": str(vol.id),
            "name": vol.name,
            "email": vol.email,
            "phone": vol.phone,
            "role": vol.role.value,
            "department": vol.department,
            "qr_hash": vol.qr_hash,
            "is_active": vol.is_active
        })
    
    return result


@router.get("/meals")
@limiter.limit("100/minute")
@require_permission("attendance:view_all")
async def get_meal_claims(
    request: Request,
    meal_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meal claim records."""
    query = db.query(MealClaim)
    
    if meal_type:
        query = query.filter(MealClaim.meal_type == meal_type)
    
    claims = query.order_by(desc(MealClaim.claimed_at)).limit(500).all()
    
    result = []
    for claim in claims:
        reg = db.query(Registration).filter(Registration.id == claim.registration_id).first()
        if reg:
            user = db.query(User).filter(User.id == reg.user_id).first()
            claimed_by = db.query(User).filter(User.id == claim.claimed_by).first()
            result.append({
                "user_id": str(user.id) if user else None,
                "user_name": user.name if user else "Unknown",
                "user_email": user.email if user else "Unknown",
                "meal_type": claim.meal_type,
                "claimed_at": claim.claimed_at.isoformat(),
                "claimed_by_name": claimed_by.name if claimed_by else "Unknown"
            })
    
    return result


@router.get("/stats")
@limiter.limit("100/minute")
@require_permission("attendance:view_all")
async def get_attendance_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall attendance statistics."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Delegate check-ins today (timezone-aware range comparison)
    delegates_checked_in = db.query(Registration).filter(
        Registration.checked_in_at >= today_start
    ).count()
    
    total_delegates = db.query(Registration).filter(
        Registration.payment_status == 'paid'
    ).count()
    
    # Meal claims today
    meals_today = db.query(MealClaim).filter(
        MealClaim.claimed_at >= today_start
    ).all()
    
    breakfast = len([m for m in meals_today if m.meal_type == 'breakfast'])
    lunch = len([m for m in meals_today if m.meal_type == 'lunch'])
    dinner = len([m for m in meals_today if m.meal_type == 'dinner'])
    
    # Active volunteers
    active_volunteers = db.query(User).filter(
        User.role.in_([UserRole.volunteer, UserRole.committee_member]),
        User.is_active == 1
    ).count()
    
    return {
        "delegates_checked_in": delegates_checked_in,
        "total_delegates": total_delegates,
        "attendance_rate": round((delegates_checked_in / total_delegates * 100) if total_delegates > 0 else 0, 1),
        "meals_today": {
            "breakfast": breakfast,
            "lunch": lunch,
            "dinner": dinner,
            "total": breakfast + lunch + dinner
        },
        "active_volunteers": active_volunteers
    }


@router.get("/export/delegates")
@limiter.limit("10/minute")
@require_permission("attendance:view_all")
async def export_delegate_attendance(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export delegate attendance to CSV."""
    registrations = db.query(Registration).filter(
        Registration.checked_in_at.isnot(None)
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Category", "Type", "Checked In At", "Reg Code"])
    
    for reg in registrations:
        user = db.query(User).filter(User.id == reg.user_id).first()
        if user:
            writer.writerow([
                user.name, user.email, user.phone,
                reg.category, reg.participation_type,
                reg.checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if reg.checked_in_at else "",
                reg.reg_code or ""
            ])
    
    output.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=delegate_attendance.csv"}
    )
