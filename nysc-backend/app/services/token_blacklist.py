"""
Token blacklist service - manages revoked JWT tokens.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
from app.models.token_blacklist import BlacklistedToken

logger = logging.getLogger(__name__)


def blacklist_token(db: Session, jti: str, user_id, expires_at: datetime, 
                    reason: str = "logout", token_type: str = "access"):
    """Add a token to the blacklist."""
    # Check if already blacklisted
    existing = db.query(BlacklistedToken).filter(BlacklistedToken.jti == jti).first()
    if existing:
        return False
    
    blacklisted = BlacklistedToken(
        jti=jti,
        user_id=user_id,
        token_type=token_type,
        expires_at=expires_at,
        reason=reason
    )
    db.add(blacklisted)
    db.commit()
    logger.info(f"Token blacklisted: jti={jti}, reason={reason}")
    return True


def is_token_blacklisted(db: Session, jti: str, user_id=None) -> bool:
    """Check if a token is blacklisted (includes user-wide revokes)."""
    # Check specific token
    token = db.query(BlacklistedToken).filter(BlacklistedToken.jti == jti).first()
    if token:
        return True
    
    # Check if user has a global revoke marker
    if user_id:
        user_revoke = db.query(BlacklistedToken).filter(
            BlacklistedToken.user_id == user_id,
            BlacklistedToken.token_type == "user_revoke"
        ).first()
        if user_revoke:
            return True
    
    return False


def cleanup_expired_tokens(db: Session) -> int:
    """Remove expired tokens from blacklist (run periodically)."""
    count = db.query(BlacklistedToken).filter(
        BlacklistedToken.expires_at < datetime.utcnow()
    ).delete()
    db.commit()
    logger.info(f"Cleaned up {count} expired blacklisted tokens")
    return count
