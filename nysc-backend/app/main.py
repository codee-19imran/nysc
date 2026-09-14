"""
NYSC-2026 Conference Backend - FastAPI Application
Simplified Architecture: Earth Observation, Mining Safety & Sustainable Development
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .core.database import Base, engine  # Import but don't create tables yet
from .api.routes import router
from .models import User  # Import to register all models

app = FastAPI(
    title="NYSC-2026 Conference API",
    description="National Conference on Earth Observation, Mining Safety & Sustainable Development",
    version="2.0.0"
)

# CORS configuration for Vercel frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "https://nysc-2026.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup (not on import)"""
    from .core.database import init_db
    init_db()

@app.get("/")
async def root():
    return {
        "message": "NYSC-2026 Conference API",
        "version": "2.0.0",
        "theme": "Earth Observation, Mining Safety & Sustainable Development"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
