"""
Finance module security — Super Admin only access.
"""
from fastapi import HTTPException, status
from app.models.user import User, UserRole


def require_super_admin(current_user: User):
    """Ensure only Super Admin can access finance operations."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance module is restricted to Super Admin only"
        )
    return current_user
