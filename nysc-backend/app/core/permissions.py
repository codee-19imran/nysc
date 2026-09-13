from functools import wraps
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.user_role import UserRoleAssignment
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from datetime import datetime, timezone

# Import this at the top of the file
from app.core.deps import get_current_user
from app.models.user_permission import UserPermission

def get_user_permissions(user_id: str, db: Session, user_role: str = None) -> list[str]:
    """Get all permissions for a user.

    Resolution order:
    1. Start with role-based permissions (from UserRoleAssignment, or user.role field fallback)
    2. Add any custom UserPermission grants on top (additive)

    Falls back to the user's role field if no UserRoleAssignment row exists.
    """

    # --- Step 1: Collect role-based permissions ---
    role_based: set[str] = set()

    assignments = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user_id,
        (UserRoleAssignment.expires_at.is_(None)) | (UserRoleAssignment.expires_at > datetime.now(timezone.utc))
    ).all()

    if assignments:
        role_ids = [a.role_id for a in assignments]
        perms = db.query(Permission.name).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).filter(
            RolePermission.role_id.in_(role_ids)
        ).distinct().all()
        role_based = {p[0] for p in perms}
    elif user_role:
        # Fallback: look up by user.role field directly
        role = db.query(Role).filter(Role.name == user_role).first()
        if role:
            perms = db.query(Permission.name).join(
                RolePermission, RolePermission.permission_id == Permission.id
            ).filter(
                RolePermission.role_id == role.id
            ).distinct().all()
            role_based = {p[0] for p in perms}

    # --- Step 2: Add any custom per-user grants on top ---
    user_overrides = db.query(UserPermission).filter(
        UserPermission.user_id == user_id
    ).all()

    custom_granted: set[str] = set()
    if user_overrides:
        granted_ids = [str(o.permission_id) for o in user_overrides if o.granted]
        if granted_ids:
            perms = db.query(Permission.name).filter(
                Permission.id.in_(granted_ids)
            ).all()
            custom_granted = {p[0] for p in perms}

    return list(role_based | custom_granted)


def has_permission(user_id: str, permission_name: str, db: Session, user_role: str = None) -> bool:
    """Check if a user has a specific permission."""
    permissions = get_user_permissions(user_id, db, user_role=user_role)
    return permission_name in permissions

def require_permission(permission_name: str):
    """Decorator to require a specific permission for an endpoint."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), **kwargs):
            if not has_permission(str(current_user.id), permission_name, db, user_role=current_user.role.value):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission_name} required"
                )
            return await func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator

def require_any_permission(*permission_names: str):
    """Decorator to require ANY of the listed permissions."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), **kwargs):
            user_permissions = get_user_permissions(str(current_user.id), db, user_role=current_user.role.value)
            if not any(perm in user_permissions for perm in permission_names):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: one of {permission_names} required"
                )
            return await func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator

def require_all_permissions(*permission_names: str):
    """Decorator to require ALL of the listed permissions."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), **kwargs):
            user_permissions = get_user_permissions(str(current_user.id), db, user_role=current_user.role.value)
            if not all(perm in user_permissions for perm in permission_names):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: all of {permission_names} required"
                )
            return await func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator
