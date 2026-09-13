"""
Use `Depends(get_current_user)` on any route that requires login.
Use `Depends(require_role("admin"))` on any route that requires a specific role.

Uses HTTPBearer (not OAuth2PasswordBearer) deliberately: our /auth/login
endpoint accepts a JSON body ({"email": ..., "password": ...}), not the
OAuth2 form-encoded username/password Swagger's built-in "Authorize"
popup expects. HTTPBearer gives a simple "paste your token here" popup
instead, which matches how login actually works in this API.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = None
    if credentials:
        token = credentials.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
        
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )
        
    from app.core.security_config import SecurityConfig
    if SecurityConfig.ENABLE_TOKEN_BLACKLIST:
        from app.services.token_blacklist import is_token_blacklisted
        jti = payload.get("jti")
        user_id = payload.get("sub")
        if jti and is_token_blacklisted(db, jti, user_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
            
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*allowed_roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to do this",
            )
        return user

    return checker
