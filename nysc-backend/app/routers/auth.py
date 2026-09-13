from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.permissions import get_user_permissions
from app.models.user import User, UserRole
from app.models.permission import Permission
from app.schemas.auth import UserSignup, UserLogin, Token, UserOut, UserUpdate
from app.core.deps import get_current_user
from app.models.registration import Registration, ParticipationType, PaymentStatus
from app.core.audit import log_action
from app.core.rate_limit import limiter
from app.core.security_config import SecurityConfig
from app.core.input_validation import sanitize_string, validate_email, validate_phone
import json
import uuid
import shutil
import logging
import os
import io
from PIL import Image
from app.services.qr_service import generate_user_qr

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit(SecurityConfig.RATE_LIMIT_REGISTER)
def signup(request: Request, response: Response, payload: UserSignup, db: Session = Depends(get_db)):
    # Sanitize inputs
    payload.name = sanitize_string(payload.name, max_length=100)
    payload.email = payload.email.strip().lower()
    
    # Validate
    if not validate_email(payload.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    if payload.phone and not validate_phone(payload.phone):
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # 1. Check if user already exists
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Create the new user with ONLY user fields (role defaults to delegate for public signups)
    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.delegate,
    )
    
    # 3. Save to database
    db.add(user)
    db.flush() # Flush to get the user.id before committing

    # --- NEW: Create a Pending Draft Registration ---
    part_type = ParticipationType.attendee
    if hasattr(payload, 'participation_type') and payload.participation_type == 'presenter':
        part_type = ParticipationType.presenter

    draft_registration = Registration(
        user_id=user.id,
        category=payload.category if hasattr(payload, 'category') else 'student',
        participation_type=part_type,
        payment_status=PaymentStatus.pending,
        
        # Registration-specific profile fields
        state=payload.state,
        city=payload.city,
        
        # Student fields (no institution — not in registrations table)
        education_level=payload.education_level,
        student_class=payload.student_class,
        field_of_study=payload.field_of_study,
        graduation_year=payload.graduation_year,
        
        # Professional fields
        organization=payload.organization,
        designation=payload.designation,
        experience=payload.experience,
    )
    
    db.add(draft_registration)
    # ------------------------------------------------

    db.commit()
    db.refresh(user)
    
    # 4. Generate JWT token
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    
    if SecurityConfig.AUTH_MODE in ["cookie", "dual"]:
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=SecurityConfig.COOKIE_SECURE,
            samesite=SecurityConfig.COOKIE_SAMESITE,
            max_age=SecurityConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    return Token(access_token=token, user=UserOut.model_validate(user))


from app.services.login_protection import (
    check_login_allowed, record_failed_login, record_successful_login
)

@router.post("/login", response_model=Token)
@limiter.limit(SecurityConfig.RATE_LIMIT_LOGIN)
def login(
    payload: UserLogin, 
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    client_ip = getattr(request.client, "host", None) if getattr(request, "client", None) else "unknown"
    
    # CHECK 1: Is login allowed?
    lock_check = check_login_allowed(db, payload.email, client_ip)
    if not lock_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=lock_check["message"],
            headers={"Retry-After": str(lock_check["retry_after"])}
        )
        
    # 1. Find user by email
    user = db.query(User).filter(User.email == payload.email).first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        # Record failed attempt
        record_failed_login(db, payload.email, client_ip)
        
        # ✅ Log failed login attempt
        log_action(
            db=db,
            admin=None,
            action="login_failed",
            target_type="user",
            details={"email": payload.email, "reason": "invalid_credentials"},
            ip_address=client_ip
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
        
    # SUCCESS: Clear failed attempts
    record_successful_login(db, payload.email, client_ip)
    
    # ✅ Log successful login
    log_action(
        db=db,
        admin=user,
        action="login_success",
        target_type="user",
        target_id=user.id,
        details={"role": getattr(user.role, "value", str(user.role))},
        ip_address=client_ip
    )
    
    # 3. Generate JWT token
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    
    if SecurityConfig.AUTH_MODE in ["cookie", "dual"]:
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=SecurityConfig.COOKIE_SECURE,
            samesite=SecurityConfig.COOKIE_SAMESITE,
            max_age=SecurityConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    return Token(access_token=token, user=UserOut.model_validate(user))

from app.core.security import decode_access_token
from app.services.token_blacklist import blacklist_token
from app.core.deps import bearer_scheme
from datetime import datetime
from fastapi.security import HTTPAuthorizationCredentials

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout and blacklist the current token."""
    # Try to get token from header or cookie
    token = None
    if credentials:
        token = credentials.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if token and SecurityConfig.ENABLE_TOKEN_BLACKLIST:
        try:
            payload = decode_access_token(token)
            if payload:
                jti = payload.get("jti")
                exp = payload.get("exp")
                expires_at = datetime.fromtimestamp(exp) if exp else datetime.utcnow()
                
                if jti:
                    blacklist_token(
                        db=db,
                        jti=jti,
                        user_id=current_user.id,
                        expires_at=expires_at,
                        reason="logout"
                    )
        except Exception as e:
            logger.warning(f"Failed to blacklist token on logout: {e}")
            
    if SecurityConfig.AUTH_MODE in ["cookie", "dual"]:
        response.delete_cookie("access_token", secure=SecurityConfig.COOKIE_SECURE, samesite=SecurityConfig.COOKIE_SAMESITE)
    
    log_action(db, current_user, "logout", "user", current_user.id,
               {}, getattr(request.client, "host", None) if getattr(request, "client", None) else None)
    
    return {"message": "Logged out successfully"}

@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Check if they are changing their email to one that already exists
    if payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Update all fields on User
    current_user.name = payload.name
    current_user.email = payload.email
    current_user.phone = payload.phone
    
    # Only update password if they provided a new one
    if payload.password:
        current_user.password_hash = hash_password(payload.password)

    # 3. Update registration if one exists
    registration = db.query(Registration).filter(
        Registration.user_id == current_user.id
    ).first()
    
    if registration:
        registration.state = payload.state
        registration.city = payload.city
        registration.category = payload.category
        # institution is not a registrations column — skip it
        registration.education_level = payload.education_level
        registration.student_class = payload.student_class
        registration.field_of_study = payload.field_of_study
        registration.graduation_year = payload.graduation_year
        registration.organization = payload.organization
        registration.designation = payload.designation
        registration.experience = payload.experience
        
        # Update participation type only if it's pending
        if registration.payment_status == PaymentStatus.pending:
            if payload.participation_type == 'presenter':
                registration.participation_type = ParticipationType.presenter
            elif payload.participation_type == 'attendee':
                registration.participation_type = ParticipationType.attendee
            elif payload.category == 'professional':
                registration.participation_type = ParticipationType.attendee # Professionals are attendees by default

    db.commit()
    db.refresh(current_user)
    
    return UserOut.model_validate(current_user)


@router.get("/me/permissions")
def get_my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's effective permissions.

    Returns a list of permission names (e.g. ["page:overview", "venue:view", ...])

    Logic:
    - Super Admin always gets ALL permissions (bypass)
    - If user has custom permission overrides → returns those
    - Otherwise → returns role-based default permissions
    - Deactivated users are blocked with 403
    """
    # Super Admin bypass: always return all permissions
    if current_user.role == UserRole.super_admin:
        all_perms = db.query(Permission.name).all()
        return [p[0] for p in all_perms]

    # Block deactivated users
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Get effective permissions (handles custom overrides + role-field fallback)
    permissions = get_user_permissions(str(current_user.id), db, user_role=getattr(current_user.role, "value", str(current_user.role)))
    return permissions

@router.get("/me/qr")
def get_my_qr(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's personal QR data. Works for ALL roles."""
    
    # Generate QR if missing (safety net)
    if not current_user.qr_hash:
        qr_hash, qr_path = generate_user_qr(
            str(current_user.id), 
            getattr(current_user.role, "value", str(current_user.role))
        )
        current_user.qr_hash = qr_hash
        db.commit()
    
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
        "role": getattr(current_user.role, "value", str(current_user.role)),
        "department": current_user.department
    }


from app.services.file_validation import process_uploaded_file

@router.post("/upload-photo")
@limiter.limit("10/minute")
async def upload_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and validate profile photo."""
    # Read file content
    content = await file.read()
    
    # Determine expected MIME from content type
    expected_mime = file.content_type
    if expected_mime not in SecurityConfig.ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG/PNG allowed")
    
    # Validate and process (with EXIF stripping)
    success, error, processed_content, safe_filename = await process_uploaded_file(
        file_content=content,
        filename=file.filename,
        expected_mime=expected_mime,
        max_size_mb=5,  # Photos max 5MB
        user_id=current_user.id,
        strip_exif=True  # Strip EXIF for privacy!
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=error)
        
    # Remove old photo if exists
    if current_user.photo_path and os.path.exists(current_user.photo_path):
        try:
            os.remove(current_user.photo_path)
        except:
            pass
    
    # Save file
    photo_dir = "static/user_photos"
    os.makedirs(photo_dir, exist_ok=True)
    file_path = os.path.join(photo_dir, safe_filename).replace("\\", "/")
    
    with open(file_path, "wb") as f:
        f.write(processed_content)
    
    # Update user record
    current_user.photo_path = file_path
    db.commit()
    
    log_action(db, current_user, "photo_uploaded", "user", current_user.id,
               {"filename": safe_filename}, request.client.host if request.client else None)
    
    return {"message": "Photo uploaded", "path": file_path}


@router.get("/me/photo")
async def get_my_photo(
    current_user: User = Depends(get_current_user)
):
    """Get current user's photo URL."""
    if not current_user.photo_path or not os.path.exists(current_user.photo_path):
        return {"has_photo": False, "photo_url": None}
    
    return {
        "has_photo": True,
        "photo_url": f"/{current_user.photo_path}"
    }