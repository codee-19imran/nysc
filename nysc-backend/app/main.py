from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi import Limiter
from fastapi.staticfiles import StaticFiles
import os

from dotenv import load_dotenv
load_dotenv()  # Load .env explicitly before importing any configs

# Create static directories
os.makedirs("static/papers", exist_ok=True)
os.makedirs("static/qr_codes", exist_ok=True)

# Import ALL routers
from app.routers import auth, registration, payment, paper, admin, settings, venue, admin_invite, volunteer, attendance, volunteer_auth, technical, hospitality, website, finance, public_website, media, contact, id_card, delegate
from app.core.database import engine, Base
from app.core.security_config import SecurityConfig
from app.core.security_middleware import SecurityHeadersMiddleware

# Security: Disable docs in production
docs_url = "/docs" if SecurityConfig.is_development() else None
redoc_url = "/redoc" if SecurityConfig.is_development() else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    
    # Start token cleanup scheduler
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    
    @scheduler.scheduled_job('interval', hours=1)
    def cleanup_job():
        from app.core.database import SessionLocal
        from app.services.token_blacklist import cleanup_expired_tokens
        db = SessionLocal()
        try:
            cleanup_expired_tokens(db)
        finally:
            db.close()
            
    if SecurityConfig.ENABLE_TOKEN_BLACKLIST:
        scheduler.start()
        
    yield
    
    if SecurityConfig.ENABLE_TOKEN_BLACKLIST:
        scheduler.shutdown()
app = FastAPI(
    title="NYSC-2026 Conference API",
    description="Conference Management System API",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url="/openapi.json" if SecurityConfig.is_development() else None,
    lifespan=lifespan
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add security headers middleware (before CORS)
app.add_middleware(SecurityHeadersMiddleware)

# Existing CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=SecurityConfig.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(registration.router)
app.include_router(payment.router)
app.include_router(paper.router)
app.include_router(admin.router)
app.include_router(settings.router)
app.include_router(venue.router)
app.include_router(admin_invite.router)
app.include_router(volunteer.router)
app.include_router(volunteer_auth.router)
app.include_router(attendance.router)
app.include_router(technical.router)
app.include_router(hospitality.router)
app.include_router(website.router)
app.include_router(finance.router)
app.include_router(public_website.router)
app.include_router(media.router)
app.include_router(contact.router)
app.include_router(id_card.router)
app.include_router(delegate.router)

@app.get("/")
def root():
    return {"message": "NYSC-2026 API", "status": "healthy"}
