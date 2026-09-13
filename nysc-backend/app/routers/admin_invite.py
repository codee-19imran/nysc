from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, timezone
import secrets
import uuid
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission, get_user_permissions
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.core.security import hash_password, verify_password
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_role import UserRoleAssignment
from app.models.user_permission import UserPermission
from app.models.admin_invite import AdminInvite, InviteStatus
from app.models.invite_code import VolunteerInviteCode
from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.admin_invite import (
    CreateInviteRequest, InviteResponse, ValidateInviteResponse,
    AcceptInviteRequest, AdminSummary, UpdatePermissionsRequest
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin-invites"])

FRONTEND_URL = "http://localhost:5173"  # Update in production


# ============ INVITE MANAGEMENT (Super Admin Only) ============

@router.post("/invites", response_model=InviteResponse)
@limiter.limit("10/hour")
@require_permission("admin:manage")
async def create_invite(
    payload: CreateInviteRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new admin invite. Only Super Admin can do this."""
    
    # 1. Verify role exists
    role = db.query(Role).filter(Role.name == payload.role).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")
    
    # 2. Check if email already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 3. Check for pending invite with same email
    pending_invite = db.query(AdminInvite).filter(
        AdminInvite.email == payload.email,
        AdminInvite.status == InviteStatus.pending
    ).first()
    if pending_invite:
        raise HTTPException(status_code=400, detail="Pending invite already exists for this email")
    
    # 4. Validate custom permissions if provided
    if payload.custom_permissions:
        valid_perms = db.query(Permission.name).all()
        valid_perm_names = [p[0] for p in valid_perms]
        invalid = [p for p in payload.custom_permissions if p not in valid_perm_names]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid}")
    
    # 5. Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    # 6. Create invite with role
    invite = AdminInvite(
        email=payload.email,
        name=payload.name,
        phone=payload.phone,
        role=payload.role,  # ✅ Store the selected role
        specialized_domain=payload.specialized_domain or "",
        token=token,
        status=InviteStatus.pending,
        created_by=current_user.id,
        expires_at=expires_at,
        details={"custom_permissions": payload.custom_permissions or []} if payload.custom_permissions else None
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    
    # 7. Log to audit
    log_action(
        db, current_user, "admin_invite_created", "invite", invite.id,
        {
            "invitee_email": payload.email,
            "invitee_name": payload.name,
            "role": payload.role,
            "has_custom_permissions": bool(payload.custom_permissions),
        },
        request.client.host if request.client else None
    )
    
    # 9. Build invite URL
    invite_url = f"{FRONTEND_URL}/admin/invite/accept?token={token}"
    
    logger.info(f"✅ Invite created for {payload.email} by {current_user.email}")
    print(f"\n🔗 INVITE LINK (share with {payload.email}):")
    print(f"   {invite_url}")
    print(f"   Expires: {expires_at.isoformat()}\n")
    
    return InviteResponse(
        id=invite.id,
        name=invite.name,
        email=invite.email,
        phone=invite.phone,
        role=payload.role,
        specialized_domain=invite.specialized_domain,
        status=invite.status.value,
        token=token,
        invite_url=invite_url,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        created_by_email=current_user.email
    )


@router.get("/invites", response_model=List[InviteResponse])
@limiter.limit("100/minute")
@require_permission("admin:manage")
async def list_invites(
    request: Request,
    status_filter: str = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all invites."""
    query = db.query(AdminInvite)
    
    if status_filter != "all":
        query = query.filter(AdminInvite.status == status_filter)
    
    invites = query.order_by(AdminInvite.created_at.desc()).all()
    
    result = []
    for invite in invites:
        creator = db.query(User).filter(User.id == invite.created_by).first()
        result.append(InviteResponse(
            id=invite.id,
            name=invite.name,
            email=invite.email,
            phone=invite.phone,
            role=invite.role,  # ✅ Use the stored role
            specialized_domain=invite.specialized_domain,
            status=invite.status.value,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
            used_at=invite.used_at,
            created_by_email=creator.email if creator else None
        ))
    
    return result


@router.delete("/invites/{invite_id}")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def revoke_invite(
    invite_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a pending invite."""
    invite = db.query(AdminInvite).filter(AdminInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.status != InviteStatus.pending:
        raise HTTPException(status_code=400, detail="Can only revoke pending invites")
    
    invite.status = InviteStatus.revoked
    db.commit()
    
    log_action(
        db, current_user, "admin_invite_revoked", "invite", invite_id,
        {"invitee_email": invite.email},
        request.client.host if request.client else None
    )
    
    return {"message": "Invite revoked"}


# ============ PUBLIC INVITE ENDPOINTS ============

@router.get("/invites/validate/{token}", response_model=ValidateInviteResponse)
@limiter.limit("30/minute")
async def validate_invite_token(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Validate an invite token (public endpoint)."""
    invite = db.query(AdminInvite).filter(AdminInvite.token == token).first()
    
    if not invite:
        return ValidateInviteResponse(valid=False, error="Invalid invite token")
    
    if invite.status != InviteStatus.pending:
        return ValidateInviteResponse(valid=False, error=f"Invite is {invite.status.value}")
    
    if invite.expires_at < datetime.now(timezone.utc):
        invite.status = InviteStatus.expired
        db.commit()
        return ValidateInviteResponse(valid=False, error="Invite has expired")
    
    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        return ValidateInviteResponse(valid=False, error="Email already registered")
    
    return ValidateInviteResponse(
        valid=True,
        invite={
            "name": invite.name,
            "email": invite.email,
            "phone": invite.phone,
            "specialized_domain": invite.specialized_domain
        }
    )


@router.post("/invites/accept/{token}")
@limiter.limit("10/hour")
async def accept_invite(
    token: str,
    payload: AcceptInviteRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Accept an invite and create the user account."""
    
    # 1. Validate password match
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # 2. Validate token
    invite = db.query(AdminInvite).filter(AdminInvite.token == token).first()
    if not invite or invite.status != InviteStatus.pending:
        raise HTTPException(status_code=400, detail="Invalid or expired invite")
    
    if invite.expires_at < datetime.now(timezone.utc):
        invite.status = InviteStatus.expired
        db.commit()
        raise HTTPException(status_code=400, detail="Invite has expired")
    
    # 3. Check email not taken
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 4. ✅ FIXED: Use the role stored in the invite
    role_name = invite.role or "admin"  # Fallback to admin if somehow missing
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=500, detail=f"Role configuration error: {role_name} not found")
    
    # 5. Create user with the correct role
    try:
        user_role_enum = UserRole[role_name]
    except KeyError:
        raise HTTPException(status_code=500, detail=f"Invalid role enum: {role_name}")
    
    new_user = User(
        name=invite.name,
        email=invite.email,
        phone=invite.phone,
        password_hash=hash_password(payload.password),
        role=user_role_enum,
        specialized_domain=invite.specialized_domain if invite.specialized_domain else None,
        is_active=1
    )
    db.add(new_user)
    db.flush()
    
    # 6. Assign role in user_roles table
    role_assignment = UserRoleAssignment(
        user_id=new_user.id,
        role_id=role.id,
        assigned_by=invite.created_by
    )
    db.add(role_assignment)
    
    # 7. Apply custom permissions if any
    invite_details = invite.details or {}
    custom_permissions = invite_details.get("custom_permissions", [])
    if custom_permissions:
        permissions = db.query(Permission).filter(Permission.name.in_(custom_permissions)).all()
        for perm in permissions:
            user_perm = UserPermission(
                user_id=new_user.id,
                permission_id=perm.id,
                granted=True,
                granted_by=invite.created_by
            )
            db.add(user_perm)
    
    # 8. Mark invite as used
    invite.status = InviteStatus.used
    invite.used_at = datetime.utcnow()
    invite.used_by_user_id = new_user.id
    
    # 9. Log to audit
    log_action(
        db, None, "admin_invite_accepted", "user", new_user.id,
        {
            "email": new_user.email,
            "name": new_user.name,
            "role": role_name,
            "invite_id": str(invite.id),
            "has_custom_permissions": bool(custom_permissions)
        },
        request.client.host if request.client else None
    )
    
    db.commit()
    
    logger.info(f"✅ Invite accepted by {new_user.email} with role {role_name}")
    
    return {
        "message": "Account created successfully",
        "email": new_user.email,
        "role": role_name,
        "redirect": "/login"
    }


# ============ TEAM MANAGEMENT (Super Admin Only) ============

@router.get("/team", response_model=List[AdminSummary])
@limiter.limit("100/minute")
@require_permission("admin:manage")
async def list_team_members(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all admin team members."""
    admin_roles = [
        UserRole.super_admin, UserRole.admin,
        UserRole.logistics_head, UserRole.technical_head,
        UserRole.hospitality_head, UserRole.media_head, UserRole.website_head
    ]
    
    admins = db.query(User).filter(User.role.in_(admin_roles)).all()
    
    result = []
    for admin in admins:
        # Check if user has custom permissions
        custom_perm_count = db.query(UserPermission).filter(
            UserPermission.user_id == admin.id
        ).count()
        
        # Get total permission count
        permissions = get_user_permissions(str(admin.id), db, user_role=admin.role.value if hasattr(admin.role, "value") else str(admin.role))
        
        result.append(AdminSummary(
            id=admin.id,
            name=admin.name,
            email=admin.email,
            phone=admin.phone,
            role=admin.role.value,
            specialized_domain=admin.specialized_domain,
            is_active=admin.is_active,
            has_custom_permissions=custom_perm_count > 0,
            permission_count=len(permissions),
            created_at=admin.created_at if hasattr(admin, 'created_at') else datetime.now(timezone.utc)
        ))
    
    return result


@router.put("/team/{user_id}/permissions")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def update_user_permissions(
    user_id: uuid.UUID,
    payload: UpdatePermissionsRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a user's custom permissions."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent Super Admin from modifying their own permissions
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own permissions")
    
    # If resetting to role defaults, remove all custom permissions
    if payload.reset_to_role_defaults:
        db.query(UserPermission).filter(UserPermission.user_id == user_id).delete()
        db.commit()
        
        log_action(
            db, current_user, "user_permissions_reset", "user", user_id,
            {"target_email": user.email},
            request.client.host if request.client else None
        )
        
        return {"message": "Permissions reset to role defaults"}
    
    # Validate permissions
    if payload.permissions:
        valid_perms = db.query(Permission.name).all()
        valid_perm_names = [p[0] for p in valid_perms]
        invalid = [p for p in payload.permissions if p not in valid_perm_names]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid}")
    
    # Remove existing custom permissions
    db.query(UserPermission).filter(UserPermission.user_id == user_id).delete()
    
    # Add new custom permissions
    permissions = db.query(Permission).filter(Permission.name.in_(payload.permissions)).all()
    for perm in permissions:
        user_perm = UserPermission(
            user_id=user_id,
            permission_id=perm.id,
            granted=True,
            granted_by=current_user.id
        )
        db.add(user_perm)
    
    db.commit()
    
    log_action(
        db, current_user, "user_permissions_updated", "user", user_id,
        {
            "target_email": user.email,
            "permission_count": len(payload.permissions),
            "permissions": payload.permissions
        },
        request.client.host if request.client else None
    )
    
    return {"message": "Permissions updated", "count": len(payload.permissions)}


@router.put("/team/{user_id}/status")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def update_user_status(
    user_id: uuid.UUID,
    is_active: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate or deactivate an admin."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user.is_active = is_active
    db.commit()
    
    action = "admin_activated" if is_active else "admin_deactivated"
    log_action(
        db, current_user, action, "user", user_id,
        {"target_email": user.email},
        request.client.host if request.client else None
    )
    
    return {"message": f"User {'activated' if is_active else 'deactivated'}"}


@router.get("/permissions/list")
@limiter.limit("100/minute")
@require_permission("admin:manage")
async def list_all_permissions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all available permissions grouped by category."""
    permissions = db.query(Permission).order_by(Permission.category, Permission.name).all()
    
    grouped = {}
    for perm in permissions:
        if perm.category not in grouped:
            grouped[perm.category] = []
        grouped[perm.category].append({
            "id": str(perm.id),
            "name": perm.name,
            "description": perm.description
        })
    
    return grouped


# ============ VOLUNTEER INVITE CODES ============

class CreateCodeRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    max_uses: int = Field(100, ge=1, le=10000)
    expires_days: int = Field(30, ge=1, le=365)
    department: Optional[str] = None

class CodeResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str]
    max_uses: int
    current_uses: int
    expires_at: datetime
    is_active: bool
    department: Optional[str] = None
    created_at: datetime
    created_by_email: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/volunteer-codes", response_model=CodeResponse)
@limiter.limit("20/hour")
@require_permission("admin:manage")
async def create_volunteer_code(
    payload: CreateCodeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new volunteer invite code."""
    # Generate readable code: NYSC-VOL-XXXXXX
    random_part = secrets.token_urlsafe(6).upper()[:6]
    code = f"NYSC-VOL-{random_part}"
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_days)
    
    invite_code = VolunteerInviteCode(
        code=code,
        name=payload.name,
        description=payload.description,
        max_uses=payload.max_uses,
        expires_at=expires_at,
        department=payload.department,
        created_by=current_user.id
    )
    db.add(invite_code)
    db.commit()
    db.refresh(invite_code)
    
    log_action(
        db, current_user, "volunteer_code_created", "invite_code", invite_code.id,
        {"code": code, "name": payload.name, "max_uses": payload.max_uses},
        request.client.host if request.client else None
    )
    
    print(f"\\n🎫 VOLUNTEER CODE CREATED:")
    print(f"   Code: {code}")
    print(f"   Name: {payload.name}")
    print(f"   Max uses: {payload.max_uses}")
    print(f"   Expires: {expires_at.isoformat()}\\n")
    
    return invite_code


@router.get("/volunteer-codes", response_model=List[CodeResponse])
@limiter.limit("100/minute")
@require_permission("admin:manage")
async def list_volunteer_codes(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all volunteer invite codes."""
    codes = db.query(VolunteerInviteCode).order_by(
        VolunteerInviteCode.created_at.desc()
    ).all()
    
    result = []
    for code in codes:
        creator = db.query(User).filter(User.id == code.created_by).first()
        result.append(CodeResponse(
            id=code.id,
            code=code.code,
            name=code.name,
            description=code.description,
            max_uses=code.max_uses,
            current_uses=code.current_uses,
            expires_at=code.expires_at,
            is_active=code.is_active,
            department=code.department,
            created_at=code.created_at,
            created_by_email=creator.email if creator else None
        ))
    
    return result


@router.put("/volunteer-codes/{code_id}/toggle")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def toggle_volunteer_code(
    code_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a volunteer code."""
    code = db.query(VolunteerInviteCode).filter(VolunteerInviteCode.id == code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    
    code.is_active = not code.is_active
    db.commit()
    
    action = "volunteer_code_activated" if code.is_active else "volunteer_code_deactivated"
    log_action(db, current_user, action, "invite_code", code_id,
               {"code": code.code}, request.client.host if request.client else None)
    
    return {"message": f"Code {'activated' if code.is_active else 'deactivated'}", "is_active": code.is_active}


@router.delete("/volunteer-codes/{code_id}")
@limiter.limit("30/minute")
@require_permission("admin:manage")
async def delete_volunteer_code(
    code_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a volunteer code."""
    code = db.query(VolunteerInviteCode).filter(VolunteerInviteCode.id == code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    
    db.delete(code)
    db.commit()
    
    log_action(db, current_user, "volunteer_code_deleted", "invite_code", code_id,
               {"code": code.code}, request.client.host if request.client else None)
    
    return {"message": "Code deleted"}
