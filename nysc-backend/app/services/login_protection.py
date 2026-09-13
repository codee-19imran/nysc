"""
Login protection service - prevents brute-force attacks.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.login_attempts import FailedLoginAttempt
from app.core.security_config import SecurityConfig
import logging

logger = logging.getLogger(__name__)


def check_login_allowed(db: Session, email: str, ip_address: str) -> dict:
    """
    Check if login is allowed for this email/IP.
    Returns: {"allowed": bool, "message": str, "retry_after": int}
    """
    # Check email-based lockout
    email_attempt = db.query(FailedLoginAttempt).filter(
        FailedLoginAttempt.identifier == email,
        FailedLoginAttempt.identifier_type == "email"
    ).first()
    
    if email_attempt and email_attempt.locked_until:
        if datetime.utcnow() < email_attempt.locked_until:
            remaining = int((email_attempt.locked_until - datetime.utcnow()).total_seconds() / 60)
            return {
                "allowed": False,
                "message": f"Account temporarily locked. Try again in {remaining} minutes.",
                "retry_after": remaining * 60,
                "lockout_type": "email"
            }
    
    # Check IP-based lockout
    ip_attempt = db.query(FailedLoginAttempt).filter(
        FailedLoginAttempt.identifier == ip_address,
        FailedLoginAttempt.identifier_type == "ip"
    ).first()
    
    if ip_attempt and ip_attempt.locked_until:
        if datetime.utcnow() < ip_attempt.locked_until:
            remaining = int((ip_attempt.locked_until - datetime.utcnow()).total_seconds() / 60)
            return {
                "allowed": False,
                "message": f"Too many attempts from your network. Try again in {remaining} minutes.",
                "retry_after": remaining * 60,
                "lockout_type": "ip"
            }
    
    return {"allowed": True, "message": "", "retry_after": 0}


def record_failed_login(db: Session, email: str, ip_address: str):
    """Record a failed login attempt."""
    max_attempts = SecurityConfig.MAX_LOGIN_ATTEMPTS
    lockout_minutes = SecurityConfig.LOCKOUT_DURATION_MINUTES
    
    # Record email attempt
    _record_attempt(db, email, "email", max_attempts, lockout_minutes)
    
    # Record IP attempt (separate counter)
    _record_attempt(db, ip_address, "ip", max_attempts * 2, lockout_minutes)
    
    logger.warning(f"Failed login recorded: email={email}, ip={ip_address}")


def _record_attempt(db: Session, identifier: str, id_type: str, 
                    max_attempts: int, lockout_minutes: int):
    """Internal helper to record an attempt."""
    attempt = db.query(FailedLoginAttempt).filter(
        FailedLoginAttempt.identifier == identifier,
        FailedLoginAttempt.identifier_type == id_type
    ).first()
    
    now = datetime.utcnow()
    
    if attempt:
        # Reset counter if last attempt was more than 1 hour ago
        # Note: Need naive datetimes if using naive, but DB uses timezone-aware depending on setup.
        # Since last_attempt_at might be timezone aware, we use now as timezone naive above.
        # Let's ensure timezones match. Since SQLAlchemy returns datetime timezone-aware if configured so,
        # we'll compare properly. Actually, `datetime.utcnow()` is naive, let's just use it as the user provided.
        if attempt.last_attempt_at and attempt.last_attempt_at.replace(tzinfo=None) < now - timedelta(hours=1):
            attempt.attempt_count = 1
            attempt.locked_until = None
        else:
            attempt.attempt_count += 1
        
        attempt.last_attempt_at = now
        
        # Lock if exceeded max attempts
        if attempt.attempt_count >= max_attempts:
            attempt.locked_until = now + timedelta(minutes=lockout_minutes)
            logger.warning(f"Account locked: {identifier} until {attempt.locked_until}")
    else:
        attempt = FailedLoginAttempt(
            identifier=identifier,
            identifier_type=id_type,
            attempt_count=1,
            last_attempt_at=now
        )
        db.add(attempt)
    
    db.commit()


def record_successful_login(db: Session, email: str, ip_address: str):
    """Clear failed attempts on successful login."""
    # Clear email attempts
    db.query(FailedLoginAttempt).filter(
        FailedLoginAttempt.identifier == email,
        FailedLoginAttempt.identifier_type == "email"
    ).delete()
    
    # Don't clear IP attempts (to protect against distributed attacks)
    db.commit()


def unlock_account(db: Session, email: str) -> bool:
    """Admin unlock of a locked account."""
    result = db.query(FailedLoginAttempt).filter(
        FailedLoginAttempt.identifier == email,
        FailedLoginAttempt.identifier_type == "email"
    ).delete()
    db.commit()
    logger.info(f"Account unlocked: {email}")
    return result > 0


def get_account_lock_status(db: Session, email: str) -> dict:
    """Get current lock status for an account."""
    attempt = db.query(FailedLoginAttempt).filter(
        FailedLoginAttempt.identifier == email,
        FailedLoginAttempt.identifier_type == "email"
    ).first()
    
    if not attempt:
        return {"locked": False, "attempts": 0}
    
    # Same datetime standard for comparison
    now = datetime.utcnow()
    locked_until_naive = attempt.locked_until.replace(tzinfo=None) if attempt.locked_until else None
    
    is_locked = locked_until_naive and now < locked_until_naive
    
    return {
        "locked": is_locked,
        "attempts": attempt.attempt_count,
        "locked_until": attempt.locked_until.isoformat() if attempt.locked_until else None,
        "last_attempt": attempt.last_attempt_at.isoformat() if attempt.last_attempt_at else None
    }
