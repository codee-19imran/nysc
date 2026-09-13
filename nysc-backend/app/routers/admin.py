from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission, require_any_permission
from app.core.rate_limit import limiter
from app.models.user import User, UserRole
from app.models.registration import Registration, PaymentStatus
from app.models.paper import Paper, PaperStatus, PaperDomain
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from app.models.review import Review, ReviewDecision
from app.models.staff_attendance import StaffAttendance
from app.schemas.admin import (
    AdminStatsResponse, 
    AdminUserResponse, 
    AdminPaperResponse,
    AuditLogResponse,
    PaperDetailResponse,
    ReviewSubmission,
    PaperMetadataUpdate,
    PaymentResponse, 
    PaymentStatsResponse,
    ConferenceSettingsResponse, 
    ConferenceSettingsUpdate
)
from app.core.audit import log_action
from app.models.settings import ConferenceSettings
from fastapi.responses import StreamingResponse
import csv
import io
import uuid
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# --- STATISTICS ENDPOINT ---
@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit("100/minute")  # Rate limit: 100 requests per minute
@require_any_permission("event:view_stats", "page:overview")
async def get_admin_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overview statistics for admin dashboard."""
    try:
        # Total registrations
        total_registrations = db.query(Registration).count()
        
        # Paid vs pending
        paid_registrations = db.query(Registration).filter(
            Registration.payment_status == PaymentStatus.paid
        ).count()
        
        pending_registrations = db.query(Registration).filter(
            Registration.payment_status == PaymentStatus.pending
        ).count()
        
        # Total revenue — Razorpay marks verified payments as 'paid'
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.status == 'paid'
        ).scalar() or 0
        
        # Papers
        papers_submitted = db.query(Paper).count()
        papers_reviewed = db.query(Paper).filter(
            Paper.review_status.in_([PaperStatus.accepted, PaperStatus.rejected])
        ).count()
        
        # Check-ins today — delegates (Registration.checked_in_at) + staff (StaffAttendance)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        delegate_checkins = db.query(Registration).filter(
            Registration.checked_in_at >= today_start
        ).count()
        
        staff_checkins = db.query(StaffAttendance).filter(
            StaffAttendance.scanned_at >= today_start
        ).count()
        
        checkins_today = delegate_checkins + staff_checkins
        
        return AdminStatsResponse(
            total_registrations=total_registrations,
            paid_registrations=paid_registrations,
            pending_registrations=pending_registrations,
            total_revenue=int(total_revenue),
            papers_submitted=papers_submitted,
            papers_reviewed=papers_reviewed,
            checkins_today=checkins_today
        )
    except Exception as e:
        logger.error(f"Error fetching admin stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

# --- USERS ENDPOINT ---
@router.get("/users", response_model=List[AdminUserResponse])
@limiter.limit("60/minute")  # Stricter rate limit for sensitive data
@require_permission("user:view")
async def get_all_users(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users with pagination and filtering."""
    try:
        query = db.query(User)
        
        # Filter by role if provided
        if role:
            query = query.filter(User.role == role)
        
        users = query.offset(skip).limit(limit).all()
        
        # Log this action
        logger.info(f"Admin {current_user.email} viewed user list (skip={skip}, limit={limit})")
        
        return users
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.put("/users/{user_id}")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def update_user_details(
    user_id: uuid.UUID,
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user status (active/inactive) or role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Security: Prevent admins from deactivating themselves
    if user.id == current_user.id and "is_active" in payload and payload["is_active"] == 0:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    changes = {}
    
    # Handle Status Toggle
    if "is_active" in payload:
        user.is_active = int(payload["is_active"])
        changes["is_active"] = user.is_active
        
    # Handle Role Change
    if "role" in payload:
        if payload["role"] in UserRole.__members__:
            user.role = UserRole[payload["role"]]
            changes["role"] = payload["role"]
        else:
            raise HTTPException(status_code=400, detail=f"Invalid role: {payload['role']}")

    db.commit()
    
    log_action(
        db, current_user, "user_updated", "user", user_id,
        {"target_email": user.email, "changes": changes},
        request.client.host if request.client else None
    )
    
    return {"message": "User updated successfully", "changes": changes}

# --- PAPERS ENDPOINT ---
@router.get("/papers", response_model=List[AdminPaperResponse])
@limiter.limit("60/minute")
@require_permission("paper:view_all")
async def get_all_papers(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all papers with pagination and filtering."""
    try:
        from app.models.paper import CoAuthor
        query = db.query(Paper)
        
        if status:
            query = query.filter(Paper.review_status == status)
        
        papers = query.offset(skip).limit(limit).all()
        
        # Build response with author info
        result = []
        for p in papers:
            registration = db.query(Registration).filter(Registration.id == p.registration_id).first()
            user_model = db.query(User).filter(User.id == registration.user_id).first() if registration else None
            co_authors = db.query(CoAuthor).filter(CoAuthor.paper_id == p.id).all()
            
            result.append(AdminPaperResponse(
                id=p.id,
                title=p.title,
                domain=p.domain if p.domain else None,
                review_status=p.review_status.value if hasattr(p.review_status, 'value') else str(p.review_status),
                created_at=p.created_at,
                primary_author_email=user_model.email if user_model else None,
                co_authors=[c.email for c in co_authors]
            ))
        
        logger.info(f"Admin {current_user.email} viewed paper list")
        
        return result
    except Exception as e:
        logger.error(f"Error fetching papers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch papers")

# ============ PAYMENTS SECTION ============

@router.get("/payments", response_model=List[PaymentResponse])
@limiter.limit("60/minute")
@require_permission("payment:view")
async def get_all_payments(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payments with filters."""
    query = db.query(Payment).join(Registration).join(User)
    
    if status:
        query = query.filter(Payment.status == status)
        # When filtering for pending/created, exclude stale attempts for
        # registrations that were eventually paid via a later attempt.
        if status in ("created", "pending"):
            query = query.filter(
                Registration.payment_status == PaymentStatus.pending
            )
    else:
        # Without a status filter: hide stale abandoned 'created' rows that
        # belong to registrations already marked as paid — these are orphaned
        # records from earlier checkout attempts and would cause double entries.
        from sqlalchemy import or_, and_
        query = query.filter(
            or_(
                Payment.status != "created",
                and_(
                    Payment.status == "created",
                    Registration.payment_status == PaymentStatus.pending
                )
            )
        )
    
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%")) |
            (Payment.razorpay_order_id.ilike(f"%{search}%"))
        )
    
    payments = query.order_by(desc(Payment.created_at)).offset(skip).limit(limit).all()
    
    # Add user info to response
    result = []
    for p in payments:
        reg = db.query(Registration).filter(Registration.id == p.registration_id).first()
        user = db.query(User).filter(User.id == reg.user_id).first() if reg else None
        result.append({
            "id": p.id,
            "registration_id": p.registration_id,
            "order_id": p.razorpay_order_id or "N/A",
            "razorpay_payment_id": p.razorpay_payment_id,
            "amount": int(p.amount * 100) if p.amount else 0,
            "currency": "INR",
            "status": p.status,
            "created_at": p.created_at,
            "captured_at": None,
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
        })
    
    return result

@router.get("/payments/stats", response_model=PaymentStatsResponse)
@limiter.limit("100/minute")
@require_permission("payment:view")
async def get_payment_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment statistics."""
    total = db.query(Payment).count()
    # Razorpay marks verified payments as 'paid'; 'created' = awaiting payment
    successful = db.query(Payment).filter(Payment.status == "paid").count()
    
    # Pending = payment rows with created/pending status BUT only where the
    # registration itself is still pending (not yet paid). This avoids counting
    # old abandoned payment attempts for users who later completed payment.
    pending = (
        db.query(Payment)
        .join(Registration, Payment.registration_id == Registration.id)
        .filter(
            Payment.status.in_(["created", "pending"]),
            Registration.payment_status == PaymentStatus.pending
        )
        .count()
    )
    
    failed = db.query(Payment).filter(Payment.status == "failed").count()
    refunded = db.query(Payment).filter(Payment.status == "refunded").count()
    
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "paid"
    ).scalar() or 0
    
    avg_ticket = int(total_revenue / successful) if successful > 0 else 0
    success_rate = (successful / total * 100) if total > 0 else 0
    
    return PaymentStatsResponse(
        total_revenue=int(total_revenue),
        total_transactions=total,
        successful=successful,
        pending=pending,
        failed=failed,
        refunded=refunded,
        success_rate=round(success_rate, 2),
        average_ticket=avg_ticket
    )

@router.get("/users/{user_id}/photo")
@limiter.limit("100/minute")
@require_permission("user:view")
async def get_user_photo(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's photo (admin only)."""
    import os
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.photo_path or not os.path.exists(user.photo_path):
        return {"has_photo": False, "photo_url": None}
    
    return {
        "has_photo": True,
        "photo_url": f"/{user.photo_path}"
    }

@router.get("/payments/export")
@limiter.limit("10/minute")
@require_permission("payment:export")
async def export_payments_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all payments to CSV."""
    payments = db.query(Payment).join(Registration).join(User).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Name", "Email", "Order ID", "Payment ID", "Amount", "Currency", "Status"])
    
    for p in payments:
        reg = db.query(Registration).filter(Registration.id == p.registration_id).first()
        user = db.query(User).filter(User.id == reg.user_id).first() if reg else None
        writer.writerow([
            p.created_at.strftime("%Y-%m-%d %H:%M"),
            user.name if user else "",
            user.email if user else "",
            p.razorpay_order_id or "N/A",
            p.razorpay_payment_id or "",
            int(p.amount * 100) if p.amount else 0,
            "INR",
            p.status
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payments.csv"}
    )

# ============ AUDIT LOGS SECTION ============

@router.get("/audit-logs", response_model=List[AuditLogResponse])
@limiter.limit("60/minute")
@require_permission("audit:view")
async def get_audit_logs(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    admin_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs with filters."""
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if admin_id:
        query = query.filter(AuditLog.admin_id == admin_id)
    
    logs = query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        admin = db.query(User).filter(User.id == log.admin_id).first() if log.admin_id else None
        result.append({
            "id": log.id,
            "admin_id": log.admin_id,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "timestamp": log.timestamp,
            "ip_address": log.ip_address,
            "admin_email": admin.email if admin else "System"
        })
    
    return result

@router.get("/audit-logs/actions")
@limiter.limit("100/minute")
@require_permission("audit:view")
async def get_audit_actions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unique action types for filter dropdown."""
    actions = db.query(AuditLog.action).distinct().all()
    return [a[0] for a in actions if a[0]]

# --- PAPER DETAIL ENDPOINT (Double-Blind) ---
@router.get("/papers/{paper_id}", response_model=PaperDetailResponse)
@limiter.limit("60/minute")
@require_permission("paper:view_all")
async def get_paper_detail(
    paper_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paper details for review. Double-blind: author info hidden."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Get registration to check ownership (but don't expose author info)
    registration = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    
    from app.models.paper import CoAuthor
    co_authors = db.query(CoAuthor).filter(CoAuthor.paper_id == paper.id).all()
    user_model = db.query(User).filter(User.id == registration.user_id).first() if registration else None
    
    return PaperDetailResponse(
        id=paper.id,
        title=paper.title,
        abstract=paper.abstract,
        domain=paper.domain if paper.domain else None,
        review_status=paper.review_status.value if hasattr(paper.review_status, 'value') else str(paper.review_status),
        file_url=paper.file_url,
        created_at=paper.created_at,
        comments_for_authors=paper.comments_for_authors,
        decision=paper.decision.value if hasattr(paper.decision, 'value') else (str(paper.decision) if paper.decision else None),
        co_authors=[c.email for c in co_authors],
        primary_author_email=user_model.email if user_model else None
    )

# --- SUBMIT REVIEW ENDPOINT ---
@router.post("/papers/{paper_id}/review")
@limiter.limit("30/minute")
@require_permission("paper:review")
async def submit_review(
    paper_id: uuid.UUID,
    payload: ReviewSubmission,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a review decision (accept/reject) for a paper."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Check if review already exists
    existing_review = db.query(Review).filter(
        Review.paper_id == paper_id,
        Review.reviewer_id == current_user.id
    ).first()
    
    if existing_review:
        # Update existing review
        existing_review.decision = payload.decision.value if hasattr(payload.decision, 'value') else payload.decision
        existing_review.comments_for_authors = payload.comments_for_authors
        existing_review.confidential_comments = payload.confidential_comments
        existing_review.updated_at = datetime.now(timezone.utc)
    else:
        # Create new review
        review = Review(
            paper_id=paper_id,
            reviewer_id=current_user.id,
            decision=payload.decision.value if hasattr(payload.decision, 'value') else payload.decision,
            comments_for_authors=payload.comments_for_authors,
            confidential_comments=payload.confidential_comments
        )
        db.add(review)
    
    # Update paper status
    if payload.decision == ReviewDecision.accepted:
        paper.review_status = PaperStatus.accepted.value
    elif payload.decision == ReviewDecision.rejected:
        paper.review_status = PaperStatus.rejected.value
    else:
        paper.review_status = PaperStatus.under_review.value
        
    paper.decision = payload.decision.value if hasattr(payload.decision, 'value') else payload.decision
    paper.comments_for_authors = payload.comments_for_authors
    paper.reviewed_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # ✅ Log the review action
    log_action(
        db=db,
        admin=current_user,
        action="paper_reviewed",
        target_type="paper",
        target_id=paper_id,
        details={
            "decision": payload.decision.value if hasattr(payload.decision, 'value') else payload.decision,
            "paper_title": paper.title,
            "has_comments": bool(payload.comments_for_authors)
        },
        ip_address=request.client.host if request.client else None
    )
    
    # Log to python logger as well
    logger.info(f"Admin {current_user.email} reviewed paper {paper_id}: {payload.decision}")
    
    return {"message": "Review submitted successfully", "status": paper.review_status}

# --- ASSIGN PAPER TO REVIEWER ---
@router.post("/papers/{paper_id}/assign")
@limiter.limit("30/minute")
@require_permission("paper:assign")
async def assign_paper(
    paper_id: uuid.UUID,
    reviewer_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a paper to a reviewer (admin)."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    reviewer = db.query(User).filter(User.id == reviewer_id).first()
    if not reviewer:
        raise HTTPException(status_code=404, detail="Reviewer not found")
    
    if reviewer.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=400, detail="User is not a reviewer")
    
    paper.assigned_reviewer_id = reviewer_id
    paper.review_status = PaperStatus.under_review
    db.commit()
    
    # ✅ Log assignment
    log_action(
        db=db,
        admin=current_user,
        action="paper_assigned",
        target_type="paper",
        target_id=paper_id,
        details={
            "reviewer_id": str(reviewer_id),
            "reviewer_email": reviewer.email,
            "paper_title": paper.title
        },
        ip_address=request.client.host if request.client else None
    )
    
    logger.info(f"Admin {current_user.email} assigned paper {paper_id} to reviewer {reviewer.email}")
    
    return {"message": "Paper assigned successfully", "reviewer": reviewer.email}

# --- GET ALL REVIEWERS (for assignment dropdown) ---
@router.get("/reviewers")
@limiter.limit("60/minute")
@require_permission("paper:assign")
async def get_reviewers(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users who can review papers (admins with domain specialization)."""
    reviewers = db.query(User).filter(
        User.role.in_([UserRole.admin, UserRole.super_admin]),
        User.specialized_domain.isnot(None)
    ).all()
    
    return [{"id": str(r.id), "name": r.name, "email": r.email, "domain": r.specialized_domain} for r in reviewers]

# --- UPDATE PAPER METADATA (Presenter can update domain, abstract) ---
@router.patch("/papers/{paper_id}/metadata")
@limiter.limit("30/minute")
@require_permission("paper:view_assigned")
async def update_paper_metadata(
    paper_id: uuid.UUID,
    payload: PaperMetadataUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update paper metadata (title, abstract, domain)."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Security: Only the paper owner or admin can update
    registration = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    if registration.user_id != current_user.id and current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    paper.title = payload.title
    paper.abstract = payload.abstract
    paper.domain = payload.domain
    
    db.commit()
    
    logger.info(f"Paper {paper_id} metadata updated by {current_user.email}")
    
    return {"message": "Paper metadata updated successfully"}

# --- GET MY PAPERS (For presenter dashboard) ---
@router.get("/my-papers")
@limiter.limit("60/minute")
async def get_my_papers(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get papers submitted by the current user."""
    registration = db.query(Registration).filter(Registration.user_id == current_user.id).first()
    if not registration:
        return []
    
    papers = db.query(Paper).filter(Paper.registration_id == registration.id).all()
    return papers

# ============ SETTINGS SECTION ============

@router.get("/settings", response_model=ConferenceSettingsResponse)
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
        # Create default settings
        settings = ConferenceSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/settings")
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
    
    # Update only provided fields
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    settings.updated_by = current_user.id
    
    db.commit()
    
    # ✅ Log settings change
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


@router.post("/users/{user_id}/force-logout")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def force_logout_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Force logout a user by blacklisting all their active tokens."""
    if current_user.role.value != 'super_admin':
        raise HTTPException(status_code=403, detail="Super Admin only")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from app.models.token_blacklist import BlacklistedToken
    from datetime import datetime, timedelta
    
    user_revoke_jti = f"user_revoke_{user_id}_{datetime.utcnow().timestamp()}"
    
    revoke_marker = BlacklistedToken(
        jti=user_revoke_jti,
        user_id=user_id,
        token_type="user_revoke",
        expires_at=datetime.utcnow() + timedelta(days=30),
        reason="admin_force_logout"
    )
    db.add(revoke_marker)
    db.commit()
    
    log_action(db, current_user, "user_force_logout", "user", user_id,
               {"target_email": user.email},
               request.client.host if request.client else None)
    
    return {"message": f"All tokens for {user.email} have been revoked"}

from app.services.login_protection import unlock_account, get_account_lock_status

@router.get("/users/{user_id}/lock-status")
@limiter.limit("100/minute")
@require_permission("admin:manage")
async def get_user_lock_status(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user account is locked."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    status = get_account_lock_status(db, user.email)
    return {
        "user_email": user.email,
        **status
    }


@router.post("/users/{user_id}/unlock")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def unlock_user_account(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlock a locked user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    unlocked = unlock_account(db, user.email)
    
    log_action(db, current_user, "user_account_unlocked", "user", user_id,
               {"target_email": user.email},
               request.client.host if request.client else None)
    
    return {
        "message": f"Account unlocked for {user.email}" if unlocked else "Account was not locked"
    }
