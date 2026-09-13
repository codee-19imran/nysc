"""
Audit Logging Utility
Centralized function for logging all admin actions.
"""
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User

def log_action(
    db: Session,
    admin: Optional[User],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[uuid.UUID] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Log an administrative action to the audit trail.
    
    Args:
        db: Database session
        admin: The admin performing the action (None for system actions)
        action: Description of the action (e.g., "paper_reviewed", "settings_updated")
        target_type: Type of target (e.g., "paper", "user", "payment")
        target_id: UUID of the target
        details: JSON dict with additional details
        ip_address: IP address of the request
    """
    try:
        log = AuditLog(
            admin_id=admin.id if admin else None,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
            ip_address=ip_address
        )
        db.add(log)
        db.commit()
    except Exception as e:
        # Don't break the main flow if audit logging fails
        # But log the error
        print(f"Audit logging failed: {str(e)}")
        db.rollback()
