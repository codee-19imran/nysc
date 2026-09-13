import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ============ ENUMS ============

class SessionType(str, enum.Enum):
    keynote = "keynote"
    technical = "technical"
    workshop = "workshop"
    panel = "panel"
    student_research = "student_research"


class SessionStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class ChallengeStatus(str, enum.Enum):
    upcoming = "upcoming"
    ongoing = "ongoing"
    completed = "completed"
    cancelled = "cancelled"


class DemoStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"


class RubricCategory(str, enum.Enum):
    presentation = "presentation"
    student_research = "student_research"
    technical_challenge = "technical_challenge"
    demo = "demo"


# ============ SESSIONS ============

class TechnicalSession(Base):
    __tablename__ = "technical_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    session_type = Column(Enum(SessionType), nullable=False)
    domain = Column(String(100), nullable=True)  # Mining / Renewable / Environmental
    description = Column(Text, nullable=True)
    
    # Schedule
    date = Column(DateTime(timezone=True), nullable=True)
    time_slot = Column(String(100), nullable=True)  # e.g., "09:00-10:30"
    duration_minutes = Column(Integer, nullable=True)
    
    # Location
    room_id = Column(UUID(as_uuid=True), ForeignKey("room_allocations.id"), nullable=True)
    
    # Capacity & Chair
    capacity = Column(Integer, default=0)
    chair_name = Column(String(255), nullable=True)  # Session chair (judge name)
    
    # Stats
    papers_assigned_count = Column(Integer, default=0)
    judges_assigned_count = Column(Integer, default=0)
    
    status = Column(Enum(SessionStatus), default=SessionStatus.scheduled, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ JUDGES (No User Accounts) ============

class TechnicalJudge(Base):
    __tablename__ = "technical_judges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    institution = Column(String(255), nullable=True)
    specialization = Column(String(100), nullable=True)  # Domain expertise
    bio = Column(Text, nullable=True)
    
    # Status
    is_available = Column(Boolean, default=True, nullable=False)
    sessions_assigned_count = Column(Integer, default=0)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ EVALUATION RUBRICS ============

class EvaluationRubric(Base):
    __tablename__ = "evaluation_rubrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    category = Column(Enum(RubricCategory), nullable=False)
    description = Column(Text, nullable=True)
    
    # Scoring
    total_score = Column(Float, default=100.0, nullable=False)
    passing_threshold = Column(Float, default=50.0, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    rubric_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_rubrics.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    max_score = Column(Float, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)  # Multiplier
    order_index = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ TECHNICAL CHALLENGES ============

class TechnicalChallenge(Base):
    __tablename__ = "technical_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    domain = Column(String(100), nullable=True)
    
    # Team rules
    min_team_size = Column(Integer, default=2)
    max_team_size = Column(Integer, default=5)
    
    # Schedule
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=True)
    time_slot = Column(String(100), nullable=True)
    
    # Location
    room_id = Column(UUID(as_uuid=True), ForeignKey("room_allocations.id"), nullable=True)
    
    # Judging
    rubric_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_rubrics.id"), nullable=True)
    
    # Stats
    registered_teams_count = Column(Integer, default=0)
    
    status = Column(Enum(ChallengeStatus), default=ChallengeStatus.upcoming, nullable=False)
    rules = Column(Text, nullable=True)
    prizes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ DEMOS & EXHIBITIONS ============

class TechnicalDemo(Base):
    __tablename__ = "technical_demos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    presenter_name = Column(String(255), nullable=True)
    domain = Column(String(100), nullable=True)
    
    # Schedule
    date = Column(DateTime(timezone=True), nullable=True)
    time_slot = Column(String(100), nullable=True)
    
    # Location
    room_id = Column(UUID(as_uuid=True), ForeignKey("room_allocations.id"), nullable=True)
    booth_number = Column(String(50), nullable=True)
    
    # Equipment (stored as JSON array of equipment IDs)
    equipment_needed = Column(JSON, nullable=True)  # [{"id": "uuid", "name": "...", "qty": 1}]
    
    status = Column(Enum(DemoStatus), default=DemoStatus.scheduled, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ LINKING TABLES ============

class SessionPaper(Base):
    """Links accepted papers to sessions (many-to-many)."""
    __tablename__ = "session_papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("technical_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    paper_id = Column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    presentation_order = Column(Integer, default=0)
    time_allocated_minutes = Column(Integer, default=15)
    is_student_research = Column(Boolean, default=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SessionJudge(Base):
    """Links judges to sessions (many-to-many)."""
    __tablename__ = "session_judges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("technical_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    judge_id = Column(UUID(as_uuid=True), ForeignKey("technical_judges.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="evaluator")  # evaluator, moderator, chair
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
