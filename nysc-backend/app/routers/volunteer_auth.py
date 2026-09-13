from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import secrets
import logging

from app.core.database import get_db
from app.core.security import hash_password
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.role import Role
from app.models.user_role import UserRoleAssignment
from app.models.invite_code import VolunteerInviteCode
from app.services.qr_service import generate_user_qr
from pydantic import BaseModel, Field, EmailStr

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/volunteer", tags=["volunteer-auth"])


# ============ SCHEMAS ============

class ValidateCodeRequest(BaseModel):
    code: str

class ValidateCodeResponse(BaseModel):
    valid: bool
    department: str = None
    error: str = None

class VolunteerRegisterRequest(BaseModel):
    code: str
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)

class VolunteerRegisterResponse(BaseModel):
    message: str
    email: str
    redirect: str = "/login"


# ============ PUBLIC ENDPOINTS ============

@router.post("/validate-code", response_model=ValidateCodeResponse)
@limiter.limit("30/minute")
async def validate_invite_code(
    payload: ValidateCodeRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Validate a volunteer invite code (public)."""
    code = db.query(VolunteerInviteCode).filter(
        VolunteerInviteCode.code == payload.code.upper()
    ).first()
    
    if not code:
        return ValidateCodeResponse(valid=False, error="Invalid code")
    
    if not code.is_active:
        return ValidateCodeResponse(valid=False, error="This code has been deactivated")
    
    if code.expires_at < datetime.now(timezone.utc):
        return ValidateCodeResponse(valid=False, error="This code has expired")
    
    if code.current_uses >= code.max_uses:
        return ValidateCodeResponse(valid=False, error="This code has reached its usage limit")
    
    return ValidateCodeResponse(valid=True, department=code.department)


@router.post("/register", response_model=VolunteerRegisterResponse)
@limiter.limit("10/hour")
async def register_volunteer(
    payload: VolunteerRegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register as a volunteer using an invite code."""
    
    # 1. Validate password strength
    if not any(c.isupper() for c in payload.password):
        raise HTTPException(status_code=400, detail="Password must contain 1 uppercase letter")
    if not any(c.isdigit() for c in payload.password):
        raise HTTPException(status_code=400, detail="Password must contain 1 number")
    
    # 2. Validate code
    code = db.query(VolunteerInviteCode).filter(
        VolunteerInviteCode.code == payload.code.upper()
    ).first()
    
    if not code or not code.is_active:
        raise HTTPException(status_code=400, detail="Invalid or deactivated code")
    
    if code.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code has expired")
    
    if code.current_uses >= code.max_uses:
        raise HTTPException(status_code=400, detail="Code usage limit reached")
    
    # 3. Check email not taken
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 4. Create volunteer user
    volunteer = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.volunteer,
        department=code.department,
        assigned_by_head=code.created_by,
        is_active=1
    )
    db.add(volunteer)
    db.flush()
    
    # 5. Generate QR code
    qr_hash, qr_path = generate_user_qr(str(volunteer.id), "volunteer")
    volunteer.qr_hash = qr_hash
    
    # 6. Assign volunteer role
    volunteer_role = db.query(Role).filter(Role.name == "volunteer").first()
    if volunteer_role:
        assignment = UserRoleAssignment(
            user_id=volunteer.id,
            role_id=volunteer_role.id,
            assigned_by=code.created_by
        )
        db.add(assignment)
    
    # 7. Increment code usage
    code.current_uses += 1
    
    # 8. Audit log
    log_action(
        db, None, "volunteer_self_registered", "user", volunteer.id,
        {
            "email": volunteer.email,
            "name": volunteer.name,
            "code_used": code.code,
            "department": code.department
        },
        request.client.host if request.client else None
    )
    
    db.commit()
    
    logger.info(f"✅ Volunteer registered: {volunteer.email} via code {code.code}")
    
    return VolunteerRegisterResponse(
        message="Volunteer account created successfully",
        email=volunteer.email,
        redirect="/login"
    )
