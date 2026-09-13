from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


# ============ SESSIONS ============

class TechnicalSessionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    session_type: str
    domain: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    duration_minutes: Optional[int] = None
    room_id: Optional[uuid.UUID] = None
    capacity: int = 0
    chair_name: Optional[str] = None
    status: str = "scheduled"
    notes: Optional[str] = None


class TechnicalSessionCreate(TechnicalSessionBase):
    pass


class TechnicalSessionUpdate(BaseModel):
    name: Optional[str] = None
    session_type: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    duration_minutes: Optional[int] = None
    room_id: Optional[uuid.UUID] = None
    capacity: Optional[int] = None
    chair_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TechnicalSessionResponse(TechnicalSessionBase):
    id: uuid.UUID
    papers_assigned_count: int
    judges_assigned_count: int
    room_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ JUDGES ============

class TechnicalJudgeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    institution: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    is_available: bool = True
    notes: Optional[str] = None


class TechnicalJudgeCreate(TechnicalJudgeBase):
    pass


class TechnicalJudgeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    institution: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    is_available: Optional[bool] = None
    notes: Optional[str] = None


class TechnicalJudgeResponse(TechnicalJudgeBase):
    id: uuid.UUID
    sessions_assigned_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ RUBRICS ============

class RubricCriterionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    max_score: float = Field(..., gt=0)
    weight: float = Field(1.0, ge=0)
    order_index: int = 0


class RubricCriterionCreate(RubricCriterionBase):
    pass


class RubricCriterionResponse(RubricCriterionBase):
    id: uuid.UUID
    rubric_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class EvaluationRubricBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str
    description: Optional[str] = None
    total_score: float = 100.0
    passing_threshold: float = 50.0
    is_active: bool = True


class EvaluationRubricCreate(EvaluationRubricBase):
    pass


class EvaluationRubricUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    total_score: Optional[float] = None
    passing_threshold: Optional[float] = None
    is_active: Optional[bool] = None


class EvaluationRubricResponse(EvaluationRubricBase):
    id: uuid.UUID
    criteria: List[RubricCriterionResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ CHALLENGES ============

class TechnicalChallengeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    domain: Optional[str] = None
    min_team_size: int = 2
    max_team_size: int = 5
    registration_deadline: Optional[datetime] = None
    event_date: Optional[datetime] = None
    time_slot: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    rubric_id: Optional[uuid.UUID] = None
    status: str = "upcoming"
    rules: Optional[str] = None
    prizes: Optional[str] = None


class TechnicalChallengeCreate(TechnicalChallengeBase):
    pass


class TechnicalChallengeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    min_team_size: Optional[int] = None
    max_team_size: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    event_date: Optional[datetime] = None
    time_slot: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    rubric_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    rules: Optional[str] = None
    prizes: Optional[str] = None


class TechnicalChallengeResponse(TechnicalChallengeBase):
    id: uuid.UUID
    registered_teams_count: int
    room_name: Optional[str] = None
    rubric_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ DEMOS ============

class TechnicalDemoBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    presenter_name: Optional[str] = None
    domain: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    booth_number: Optional[str] = None
    equipment_needed: Optional[List[Dict[str, Any]]] = None
    status: str = "scheduled"
    notes: Optional[str] = None


class TechnicalDemoCreate(TechnicalDemoBase):
    pass


class TechnicalDemoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    presenter_name: Optional[str] = None
    domain: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    booth_number: Optional[str] = None
    equipment_needed: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TechnicalDemoResponse(TechnicalDemoBase):
    id: uuid.UUID
    room_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ SESSION-PAPER LINK ============

class SessionPaperCreate(BaseModel):
    session_id: uuid.UUID
    paper_id: uuid.UUID
    presentation_order: int = 0
    time_allocated_minutes: int = 15
    is_student_research: bool = False


class SessionPaperResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    paper_id: uuid.UUID
    presentation_order: int
    time_allocated_minutes: int
    is_student_research: bool
    assigned_at: datetime
    # Paper details (joined)
    paper_title: Optional[str] = None
    paper_author: Optional[str] = None
    paper_domain: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ SESSION-JUDGE LINK ============

class SessionJudgeCreate(BaseModel):
    session_id: uuid.UUID
    judge_id: uuid.UUID
    role: str = "evaluator"


class SessionJudgeResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    judge_id: uuid.UUID
    role: str
    assigned_at: datetime
    # Judge details (joined)
    judge_name: Optional[str] = None
    judge_specialization: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ STATS ============

class TechnicalStatsResponse(BaseModel):
    accepted_papers: int
    papers_assigned: int
    papers_unassigned: int
    sessions_scheduled: int
    judges_count: int
    challenges_active: int
    demos_scheduled: int
    rubrics_active: int
