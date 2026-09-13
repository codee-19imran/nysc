"""
Security headers middleware - adds protective HTTP headers to all responses.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security_config import SecurityConfig


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if SecurityConfig.ENABLE_SECURITY_HEADERS:
            # Prevent MIME type sniffing
            response.headers["X-Content-Type-Options"] = "nosniff"
            
            # Prevent clickjacking
            response.headers["X-Frame-Options"] = "DENY"
            
            # Enable XSS protection
            response.headers["X-XSS-Protection"] = "1; mode=block"
            
            # Control referrer information
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            # Restrict browser features
            response.headers["Permissions-Policy"] = (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
            )
            
            # HTTP Strict Transport Security (only if HTTPS)
            if SecurityConfig.is_production():
                response.headers["Strict-Transport-Security"] = (
                    f"max-age={SecurityConfig.HSTS_MAX_AGE}; includeSubDomains; preload"
                )
            
            # Remove server header (hide tech stack)
            if "server" in response.headers:
                del response.headers["server"]
        
        return response
