"""
Security configuration - centralized security settings.
All values loaded from environment variables.
"""
import os
from typing import List
import secrets


class SecurityConfig:
    """Centralized security configuration."""
    
    # Environment
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")  # development, staging, production
    DEBUG = ENVIRONMENT == "development"
    
    # Secret key validation
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        if ENVIRONMENT == "production":
            raise ValueError("SECRET_KEY must be set in production environment")
        SECRET_KEY = secrets.token_urlsafe(32)
    elif len(SECRET_KEY) < 32 and ENVIRONMENT == "production":
        raise ValueError("SECRET_KEY must be at least 32 characters in production")
    
    # JWT settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # CORS settings
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    
    # Rate limiting
    RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")
    RATE_LIMIT_LOGIN = os.getenv("RATE_LIMIT_LOGIN", "5/minute")
    RATE_LIMIT_REGISTER = os.getenv("RATE_LIMIT_REGISTER", "10/hour")
    RATE_LIMIT_PASSWORD_RESET = os.getenv("RATE_LIMIT_PASSWORD_RESET", "3/hour")
    
    # File upload limits
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"]
    ALLOWED_DOCUMENT_TYPES = ["application/pdf"]
    
    # Security headers
    ENABLE_SECURITY_HEADERS = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"
    HSTS_MAX_AGE = int(os.getenv("HSTS_MAX_AGE", "31536000"))  # 1 year
    
    # Login protection
    MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "10"))
    ENABLE_TOKEN_BLACKLIST = os.getenv("ENABLE_TOKEN_BLACKLIST", "true").lower() == "true"
    LOCKOUT_DURATION_MINUTES = int(os.getenv("LOCKOUT_DURATION_MINUTES", "15"))
    
    # Token blacklist
    ENABLE_TOKEN_BLACKLIST = os.getenv("ENABLE_TOKEN_BLACKLIST", "false").lower() == "true"
    
    # Cookie settings (for Phase 5)
    AUTH_MODE = os.getenv("AUTH_MODE", "localStorage")  # localStorage, cookie, dual
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
    
    @classmethod
    def is_production(cls) -> bool:
        return cls.ENVIRONMENT == "production"
    
    @classmethod
    def is_development(cls) -> bool:
        return cls.ENVIRONMENT == "development"
