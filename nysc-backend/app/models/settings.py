import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class ConferenceSettings(Base):
    __tablename__ = "conference_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Conference Info
    conference_dates = Column(String(100), default="Dec 17-18, 2026")
    venue = Column(String(255), default="Central University of Karnataka")
    
    # Pricing
    student_fee = Column(Integer, default=2999)
    professional_fee = Column(Integer, default=4199)
    # Important Dates
    paper_submission_deadline = Column(DateTime(timezone=True), nullable=True)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    important_dates = Column(JSON, nullable=True)
    
    # Meal Timings (stored as JSON: {"breakfast": "8:00-10:00", ...})
    meal_timings = Column(JSON, default={
        "breakfast": "08:00-10:00",
        "lunch": "12:30-14:30",
        "dinner": "19:00-21:00"
    })
    
    # Domains
    domains = Column(JSON, default=[
        "Mining & Earth Observation",
        "Renewable Energy & Sustainability",
        "Environmental Science & Climate"
    ])
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(UUID(as_uuid=True), nullable=True)
