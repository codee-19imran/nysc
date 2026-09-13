from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
import uuid
import csv
import io
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User
from app.models.paper import Paper, PaperStatus
from app.models.venue import RoomAllocation, Equipment
from app.models.technical import (
    TechnicalSession, TechnicalJudge, EvaluationRubric, RubricCriterion,
    TechnicalChallenge, TechnicalDemo, SessionPaper, SessionJudge,
    SessionStatus, ChallengeStatus, DemoStatus
)
from app.schemas.technical import (
    TechnicalSessionCreate, TechnicalSessionUpdate, TechnicalSessionResponse,
    TechnicalJudgeCreate, TechnicalJudgeUpdate, TechnicalJudgeResponse,
    EvaluationRubricCreate, EvaluationRubricUpdate, EvaluationRubricResponse,
    RubricCriterionCreate, RubricCriterionResponse,
    TechnicalChallengeCreate, TechnicalChallengeUpdate, TechnicalChallengeResponse,
    TechnicalDemoCreate, TechnicalDemoUpdate, TechnicalDemoResponse,
    SessionPaperCreate, SessionPaperResponse,
    SessionJudgeCreate, SessionJudgeResponse,
    TechnicalStatsResponse
)
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/technical", tags=["technical"])

# Equipment categories visible to Technical department
TECHNICAL_EQUIPMENT_CATEGORIES = ['AV', 'Audio', 'IT']


# ============ STATS ============

@router.get("/stats", response_model=TechnicalStatsResponse)
@limiter.limit("100/minute")
@require_permission("technical:view")
async def get_technical_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get technical dashboard statistics."""
    accepted_papers = db.query(Paper).filter(Paper.review_status == PaperStatus.accepted).count()
    
    # Papers assigned to sessions
    papers_assigned = db.query(SessionPaper).count()
    papers_unassigned = accepted_papers - papers_assigned
    
    sessions_scheduled = db.query(TechnicalSession).filter(
        TechnicalSession.status == SessionStatus.scheduled
    ).count()
    
    judges_count = db.query(TechnicalJudge).count()
    
    challenges_active = db.query(TechnicalChallenge).filter(
        TechnicalChallenge.status.in_([ChallengeStatus.upcoming, ChallengeStatus.ongoing])
    ).count()
    
    demos_scheduled = db.query(TechnicalDemo).filter(
        TechnicalDemo.status == DemoStatus.scheduled
    ).count()
    
    rubrics_active = db.query(EvaluationRubric).filter(EvaluationRubric.is_active == True).count()
    
    return TechnicalStatsResponse(
        accepted_papers=accepted_papers,
        papers_assigned=papers_assigned,
        papers_unassigned=max(0, papers_unassigned),
        sessions_scheduled=sessions_scheduled,
        judges_count=judges_count,
        challenges_active=challenges_active,
        demos_scheduled=demos_scheduled,
        rubrics_active=rubrics_active
    )


# ============ SESSIONS ============

@router.get("/sessions", response_model=List[TechnicalSessionResponse])
@limiter.limit("100/minute")
@require_permission("technical:view")
async def get_sessions(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all technical sessions."""
    query = db.query(TechnicalSession)
    if status_filter:
        query = query.filter(TechnicalSession.status == status_filter)
    
    sessions = query.order_by(TechnicalSession.date.asc().nullslast()).all()
    
    result = []
    for s in sessions:
        room_name = None
        if s.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == s.room_id).first()
            room_name = room.room_name if room else None
        
        result.append(TechnicalSessionResponse(
            id=s.id,
            name=s.name,
            session_type=s.session_type.value,
            domain=s.domain,
            description=s.description,
            date=s.date,
            time_slot=s.time_slot,
            duration_minutes=s.duration_minutes,
            room_id=s.room_id,
            room_name=room_name,
            capacity=s.capacity,
            chair_name=s.chair_name,
            papers_assigned_count=s.papers_assigned_count,
            judges_assigned_count=s.judges_assigned_count,
            status=s.status.value,
            notes=s.notes,
            created_at=s.created_at
        ))
    
    return result


@router.post("/sessions", response_model=TechnicalSessionResponse)
@limiter.limit("30/minute")
@require_permission("technical:edit")
async def create_session(
    payload: TechnicalSessionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new technical session."""
    session = TechnicalSession(**payload.dict())
    db.add(session)
    db.commit()
    db.refresh(session)
    
    log_action(db, current_user, "technical_session_created", "session", session.id,
               {"name": session.name}, request.client.host if request.client else None)
    
    return session


@router.put("/sessions/{session_id}", response_model=TechnicalSessionResponse)
@limiter.limit("60/minute")
@require_permission("technical:edit")
async def update_session(
    session_id: uuid.UUID,
    payload: TechnicalSessionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a technical session."""
    session = db.query(TechnicalSession).filter(TechnicalSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(session, key, value)
    
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}")
@limiter.limit("30/minute")
@require_permission("technical:edit")
async def delete_session(
    session_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a technical session."""
    session = db.query(TechnicalSession).filter(TechnicalSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


# ============ JUDGES ============

@router.get("/judges", response_model=List[TechnicalJudgeResponse])
@limiter.limit("100/minute")
@require_permission("technical:judges")
async def get_judges(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all judges."""
    return db.query(TechnicalJudge).order_by(TechnicalJudge.name).all()


@router.post("/judges", response_model=TechnicalJudgeResponse)
@limiter.limit("30/minute")
@require_permission("technical:judges")
async def create_judge(
    payload: TechnicalJudgeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new judge."""
    judge = TechnicalJudge(**payload.dict())
    db.add(judge)
    db.commit()
    db.refresh(judge)
    
    log_action(db, current_user, "technical_judge_created", "judge", judge.id,
               {"name": judge.name}, request.client.host if request.client else None)
    
    return judge


@router.put("/judges/{judge_id}", response_model=TechnicalJudgeResponse)
@limiter.limit("60/minute")
@require_permission("technical:judges")
async def update_judge(
    judge_id: uuid.UUID,
    payload: TechnicalJudgeUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a judge."""
    judge = db.query(TechnicalJudge).filter(TechnicalJudge.id == judge_id).first()
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(judge, key, value)
    
    db.commit()
    db.refresh(judge)
    return judge


@router.delete("/judges/{judge_id}")
@limiter.limit("30/minute")
@require_permission("technical:judges")
async def delete_judge(
    judge_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a judge."""
    judge = db.query(TechnicalJudge).filter(TechnicalJudge.id == judge_id).first()
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    
    db.delete(judge)
    db.commit()
    return {"message": "Judge deleted"}


# ============ ACCEPTED PAPERS (Coordination View) ============

@router.get("/accepted-papers")
@limiter.limit("100/minute")
@require_permission("technical:schedule")
async def get_accepted_papers(
    request: Request,
    domain: Optional[str] = None,
    assigned_filter: Optional[str] = None,  # 'assigned', 'unassigned', 'all'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get only accepted papers with assignment status."""
    query = db.query(Paper).filter(Paper.review_status == PaperStatus.accepted)
    
    if domain:
        query = query.filter(Paper.domain == domain)
    
    papers = query.order_by(Paper.created_at.desc()).all()
    
    result = []
    for paper in papers:
        # Check if assigned to any session
        session_link = db.query(SessionPaper).filter(SessionPaper.paper_id == paper.id).first()
        
        # Apply assignment filter
        if assigned_filter == 'assigned' and not session_link:
            continue
        if assigned_filter == 'unassigned' and session_link:
            continue
        
        # Get author info
        author = db.query(User).filter(User.id == paper.user_id).first() if hasattr(paper, 'user_id') else None
        
        result.append({
            "id": str(paper.id),
            "title": paper.title,
            "domain": paper.domain,
            "abstract": paper.abstract[:200] + "..." if paper.abstract and len(paper.abstract) > 200 else paper.abstract,
            "author_name": author.name if author else "Unknown",
            "author_email": author.email if author else "Unknown",
            "submitted_at": paper.created_at.isoformat() if hasattr(paper, 'created_at') else None,
            "assigned_to_session": str(session_link.session_id) if session_link else None,
            "is_student_research": session_link.is_student_research if session_link else False,
            "presentation_order": session_link.presentation_order if session_link else 0
        })
    
    return result


# ============ SESSION-PAPER ASSIGNMENTS ============

@router.post("/session-papers", response_model=SessionPaperResponse)
@limiter.limit("60/minute")
@require_permission("technical:schedule")
async def assign_paper_to_session(
    payload: SessionPaperCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign an accepted paper to a session."""
    # Verify paper is accepted
    paper = db.query(Paper).filter(Paper.id == payload.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.review_status != PaperStatus.accepted:
        raise HTTPException(status_code=400, detail="Paper must be accepted first")
    
    # Check if already assigned
    existing = db.query(SessionPaper).filter(SessionPaper.paper_id == payload.paper_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Paper already assigned to a session")
    
    # Verify session exists
    session = db.query(TechnicalSession).filter(TechnicalSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create assignment
    link = SessionPaper(**payload.dict())
    db.add(link)
    
    # Update session paper count
    session.papers_assigned_count = db.query(SessionPaper).filter(
        SessionPaper.session_id == session.id
    ).count() + 1
    
    db.commit()
    db.refresh(link)
    
    author = db.query(User).filter(User.id == paper.user_id).first() if hasattr(paper, 'user_id') else None
    
    log_action(db, current_user, "paper_assigned_to_session", "session", session.id,
               {"paper_id": str(paper.id), "paper_title": paper.title},
               request.client.host if request.client else None)
    
    return SessionPaperResponse(
        id=link.id,
        session_id=link.session_id,
        paper_id=link.paper_id,
        presentation_order=link.presentation_order,
        time_allocated_minutes=link.time_allocated_minutes,
        is_student_research=link.is_student_research,
        assigned_at=link.assigned_at,
        paper_title=paper.title,
        paper_author=author.name if author else None,
        paper_domain=paper.domain
    )


@router.delete("/session-papers/{paper_id}")
@limiter.limit("60/minute")
@require_permission("technical:schedule")
async def unassign_paper(
    paper_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove paper from session."""
    link = db.query(SessionPaper).filter(SessionPaper.paper_id == paper_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    session_id = link.session_id
    db.delete(link)
    
    # Update session paper count
    session = db.query(TechnicalSession).filter(TechnicalSession.id == session_id).first()
    if session:
        session.papers_assigned_count = db.query(SessionPaper).filter(
            SessionPaper.session_id == session_id
        ).count()
    
    db.commit()
    return {"message": "Paper unassigned"}


# ============ SESSION-JUDGE ASSIGNMENTS ============

@router.post("/session-judges", response_model=SessionJudgeResponse)
@limiter.limit("60/minute")
@require_permission("technical:judges")
async def assign_judge_to_session(
    payload: SessionJudgeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a judge to a session."""
    judge = db.query(TechnicalJudge).filter(TechnicalJudge.id == payload.judge_id).first()
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    
    session = db.query(TechnicalSession).filter(TechnicalSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check duplicate
    existing = db.query(SessionJudge).filter(
        SessionJudge.session_id == payload.session_id,
        SessionJudge.judge_id == payload.judge_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Judge already assigned to this session")
    
    link = SessionJudge(**payload.dict())
    db.add(link)
    
    # Update counts
    judge.sessions_assigned_count += 1
    session.judges_assigned_count = db.query(SessionJudge).filter(
        SessionJudge.session_id == session.id
    ).count()
    
    db.commit()
    db.refresh(link)
    
    return SessionJudgeResponse(
        id=link.id,
        session_id=link.session_id,
        judge_id=link.judge_id,
        role=link.role,
        assigned_at=link.assigned_at,
        judge_name=judge.name,
        judge_specialization=judge.specialization
    )


@router.delete("/session-judges/{link_id}")
@limiter.limit("60/minute")
@require_permission("technical:judges")
async def remove_judge_from_session(
    link_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove judge from session."""
    link = db.query(SessionJudge).filter(SessionJudge.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    judge = db.query(TechnicalJudge).filter(TechnicalJudge.id == link.judge_id).first()
    session = db.query(TechnicalSession).filter(TechnicalSession.id == link.session_id).first()
    
    db.delete(link)
    
    if judge:
        judge.sessions_assigned_count = max(0, judge.sessions_assigned_count - 1)
    if session:
        session.judges_assigned_count = db.query(SessionJudge).filter(
            SessionJudge.session_id == session.id
        ).count()
    
    db.commit()
    return {"message": "Judge removed from session"}


# ============ RUBRICS ============

@router.get("/rubrics", response_model=List[EvaluationRubricResponse])
@limiter.limit("100/minute")
@require_permission("technical:rubrics")
async def get_rubrics(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rubrics with criteria."""
    rubrics = db.query(EvaluationRubric).order_by(EvaluationRubric.name).all()
    
    result = []
    for r in rubrics:
        criteria = db.query(RubricCriterion).filter(
            RubricCriterion.rubric_id == r.id
        ).order_by(RubricCriterion.order_index).all()
        
        result.append(EvaluationRubricResponse(
            id=r.id,
            name=r.name,
            category=r.category.value,
            description=r.description,
            total_score=r.total_score,
            passing_threshold=r.passing_threshold,
            is_active=r.is_active,
            criteria=[RubricCriterionResponse.model_validate(c) for c in criteria],
            created_at=r.created_at
        ))
    
    return result


@router.post("/rubrics", response_model=EvaluationRubricResponse)
@limiter.limit("30/minute")
@require_permission("technical:rubrics")
async def create_rubric(
    payload: EvaluationRubricCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new rubric."""
    rubric = EvaluationRubric(**payload.dict())
    db.add(rubric)
    db.commit()
    db.refresh(rubric)
    
    return EvaluationRubricResponse(
        id=rubric.id, name=rubric.name, category=rubric.category.value,
        description=rubric.description, total_score=rubric.total_score,
        passing_threshold=rubric.passing_threshold, is_active=rubric.is_active,
        criteria=[], created_at=rubric.created_at
    )


@router.post("/rubrics/{rubric_id}/criteria", response_model=RubricCriterionResponse)
@limiter.limit("60/minute")
@require_permission("technical:rubrics")
async def add_criterion(
    rubric_id: uuid.UUID,
    payload: RubricCriterionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a criterion to a rubric."""
    rubric = db.query(EvaluationRubric).filter(EvaluationRubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    criterion = RubricCriterion(rubric_id=rubric_id, **payload.dict())
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return criterion


@router.delete("/rubrics/{rubric_id}/criteria/{criterion_id}")
@limiter.limit("60/minute")
@require_permission("technical:rubrics")
async def delete_criterion(
    rubric_id: uuid.UUID,
    criterion_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a criterion."""
    criterion = db.query(RubricCriterion).filter(
        RubricCriterion.id == criterion_id,
        RubricCriterion.rubric_id == rubric_id
    ).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")
    
    db.delete(criterion)
    db.commit()
    return {"message": "Criterion deleted"}


@router.delete("/rubrics/{rubric_id}")
@limiter.limit("30/minute")
@require_permission("technical:rubrics")
async def delete_rubric(
    rubric_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a rubric (cascades to criteria)."""
    rubric = db.query(EvaluationRubric).filter(EvaluationRubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    db.delete(rubric)
    db.commit()
    return {"message": "Rubric deleted"}


# ============ CHALLENGES ============

@router.get("/challenges", response_model=List[TechnicalChallengeResponse])
@limiter.limit("100/minute")
@require_permission("technical:challenges")
async def get_challenges(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all technical challenges."""
    challenges = db.query(TechnicalChallenge).order_by(TechnicalChallenge.event_date.asc().nullslast()).all()
    
    result = []
    for c in challenges:
        room_name = None
        if c.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == c.room_id).first()
            room_name = room.room_name if room else None
        
        rubric_name = None
        if c.rubric_id:
            rubric = db.query(EvaluationRubric).filter(EvaluationRubric.id == c.rubric_id).first()
            rubric_name = rubric.name if rubric else None
        
        result.append(TechnicalChallengeResponse(
            id=c.id, name=c.name, description=c.description, domain=c.domain,
            min_team_size=c.min_team_size, max_team_size=c.max_team_size,
            registration_deadline=c.registration_deadline, event_date=c.event_date,
            time_slot=c.time_slot, room_id=c.room_id, room_name=room_name,
            rubric_id=c.rubric_id, rubric_name=rubric_name,
            registered_teams_count=c.registered_teams_count,
            status=c.status.value, rules=c.rules, prizes=c.prizes,
            created_at=c.created_at
        ))
    
    return result


@router.post("/challenges", response_model=TechnicalChallengeResponse)
@limiter.limit("30/minute")
@require_permission("technical:challenges")
async def create_challenge(
    payload: TechnicalChallengeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new technical challenge."""
    challenge = TechnicalChallenge(**payload.dict())
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.put("/challenges/{challenge_id}", response_model=TechnicalChallengeResponse)
@limiter.limit("60/minute")
@require_permission("technical:challenges")
async def update_challenge(
    challenge_id: uuid.UUID,
    payload: TechnicalChallengeUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a technical challenge."""
    challenge = db.query(TechnicalChallenge).filter(TechnicalChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(challenge, key, value)
    
    db.commit()
    db.refresh(challenge)
    return challenge


@router.delete("/challenges/{challenge_id}")
@limiter.limit("30/minute")
@require_permission("technical:challenges")
async def delete_challenge(
    challenge_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a technical challenge."""
    challenge = db.query(TechnicalChallenge).filter(TechnicalChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    db.delete(challenge)
    db.commit()
    return {"message": "Challenge deleted"}


# ============ DEMOS ============

@router.get("/demos", response_model=List[TechnicalDemoResponse])
@limiter.limit("100/minute")
@require_permission("technical:demos")
async def get_demos(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all demos."""
    demos = db.query(TechnicalDemo).order_by(TechnicalDemo.date.asc().nullslast()).all()
    
    result = []
    for d in demos:
        room_name = None
        if d.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == d.room_id).first()
            room_name = room.room_name if room else None
        
        result.append(TechnicalDemoResponse(
            id=d.id, name=d.name, description=d.description,
            presenter_name=d.presenter_name, domain=d.domain,
            date=d.date, time_slot=d.time_slot,
            room_id=d.room_id, room_name=room_name,
            booth_number=d.booth_number, equipment_needed=d.equipment_needed,
            status=d.status.value, notes=d.notes, created_at=d.created_at
        ))
    
    return result


@router.post("/demos", response_model=TechnicalDemoResponse)
@limiter.limit("30/minute")
@require_permission("technical:demos")
async def create_demo(
    payload: TechnicalDemoCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new demo."""
    demo = TechnicalDemo(**payload.dict())
    db.add(demo)
    db.commit()
    db.refresh(demo)
    return demo


@router.put("/demos/{demo_id}", response_model=TechnicalDemoResponse)
@limiter.limit("60/minute")
@require_permission("technical:demos")
async def update_demo(
    demo_id: uuid.UUID,
    payload: TechnicalDemoUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a demo."""
    demo = db.query(TechnicalDemo).filter(TechnicalDemo.id == demo_id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(demo, key, value)
    
    db.commit()
    db.refresh(demo)
    return demo


@router.delete("/demos/{demo_id}")
@limiter.limit("30/minute")
@require_permission("technical:demos")
async def delete_demo(
    demo_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a demo."""
    demo = db.query(TechnicalDemo).filter(TechnicalDemo.id == demo_id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    db.delete(demo)
    db.commit()
    return {"message": "Demo deleted"}


# ============ TECHNICAL EQUIPMENT (Filtered, Read-Only) ============

@router.get("/equipment")
@limiter.limit("100/minute")
@require_permission("technical:demos")
async def get_technical_equipment(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ONLY technical-related equipment (AV, Audio, IT). Read-only."""
    equipment = db.query(Equipment).filter(
        Equipment.category.in_(TECHNICAL_EQUIPMENT_CATEGORIES)
    ).order_by(Equipment.category, Equipment.name).all()
    
    return equipment


# ============ ROOMS (For session/challenge/demo allocation) ============

@router.get("/rooms")
@limiter.limit("100/minute")
@require_permission("technical:view")
async def get_rooms_for_allocation(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get rooms for session/challenge/demo allocation (read-only)."""
    return db.query(RoomAllocation).order_by(RoomAllocation.room_name).all()


# ============ EXPORTS ============

@router.get("/export/sessions")
@limiter.limit("10/minute")
@require_permission("technical:export")
async def export_sessions_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export sessions to CSV."""
    sessions = db.query(TechnicalSession).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Type", "Domain", "Date", "Time Slot", "Room", "Chair", "Papers", "Judges", "Status"])
    
    for s in sessions:
        room_name = ""
        if s.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == s.room_id).first()
            room_name = room.room_name if room else ""
        
        writer.writerow([
            s.name, s.session_type.value, s.domain or "",
            s.date.strftime("%Y-%m-%d") if s.date else "",
            s.time_slot or "", room_name, s.chair_name or "",
            s.papers_assigned_count, s.judges_assigned_count, s.status.value
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=technical_sessions.csv"}
    )


@router.get("/export/judges")
@limiter.limit("10/minute")
@require_permission("technical:export")
async def export_judges_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export judges with session assignments to CSV."""
    judges = db.query(TechnicalJudge).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Institution", "Specialization", "Sessions Assigned", "Session Names"])
    
    for j in judges:
        # Get session names
        session_links = db.query(SessionJudge).filter(SessionJudge.judge_id == j.id).all()
        session_names = []
        for link in session_links:
            session = db.query(TechnicalSession).filter(TechnicalSession.id == link.session_id).first()
            if session:
                session_names.append(session.name)
        
        writer.writerow([
            j.name, j.email or "", j.phone or "",
            j.institution or "", j.specialization or "",
            j.sessions_assigned_count, "; ".join(session_names)
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=judges_schedule.csv"}
    )


@router.get("/export/papers-by-session")
@limiter.limit("10/minute")
@require_permission("technical:export")
async def export_papers_by_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export papers grouped by session."""
    sessions = db.query(TechnicalSession).order_by(TechnicalSession.date.asc().nullslast()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Session", "Date", "Time", "Order", "Paper Title", "Author", "Domain", "Student Research"])
    
    for session in sessions:
        links = db.query(SessionPaper).filter(
            SessionPaper.session_id == session.id
        ).order_by(SessionPaper.presentation_order).all()
        
        for link in links:
            paper = db.query(Paper).filter(Paper.id == link.paper_id).first()
            if paper:
                author = db.query(User).filter(User.id == paper.user_id).first() if hasattr(paper, 'user_id') else None
                writer.writerow([
                    session.name,
                    session.date.strftime("%Y-%m-%d") if session.date else "",
                    session.time_slot or "",
                    link.presentation_order,
                    paper.title,
                    author.name if author else "",
                    paper.domain or "",
                    "Yes" if link.is_student_research else "No"
                ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=papers_by_session.csv"}
    )


@router.get("/export/challenges")
@limiter.limit("10/minute")
@require_permission("technical:export")
async def export_challenges_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export technical challenges to CSV."""
    challenges = db.query(TechnicalChallenge).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Domain", "Team Size", "Event Date", "Room", "Teams Registered", "Status"])
    
    for c in challenges:
        room_name = ""
        if c.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == c.room_id).first()
            room_name = room.room_name if room else ""
        
        writer.writerow([
            c.name, c.domain or "",
            f"{c.min_team_size}-{c.max_team_size}",
            c.event_date.strftime("%Y-%m-%d") if c.event_date else "",
            room_name, c.registered_teams_count, c.status.value
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=technical_challenges.csv"}
    )


@router.get("/export/demos")
@limiter.limit("10/minute")
@require_permission("technical:export")
async def export_demos_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export demos to CSV."""
    demos = db.query(TechnicalDemo).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Presenter", "Domain", "Date", "Time", "Room", "Booth", "Status"])
    
    for d in demos:
        room_name = ""
        if d.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == d.room_id).first()
            room_name = room.room_name if room else ""
        
        writer.writerow([
            d.name, d.presenter_name or "", d.domain or "",
            d.date.strftime("%Y-%m-%d") if d.date else "",
            d.time_slot or "", room_name, d.booth_number or "", d.status.value
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=technical_demos.csv"}
    )


# ============ SEED PRE-LOADED DATA ============

@router.post("/seed")
@limiter.limit("1/minute")
@require_permission("technical:edit")
async def seed_technical_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Seed pre-loaded technical data. Run once."""
    if db.query(TechnicalSession).count() > 0:
        return {"message": "Data already seeded", "skipped": True}
    
    # --- 8 Sessions ---
    sessions_data = [
        {"name": "Inaugural Session & Keynote", "session_type": "keynote", "domain": None,
         "description": "Opening ceremony with chief guest address", "time_slot": "09:00-10:30", "capacity": 500},
        {"name": "Mining & Earth Observation Track", "session_type": "technical", "domain": "Mining & Earth Observation",
         "description": "Technical papers on mining and earth observation", "time_slot": "11:00-13:00", "capacity": 150},
        {"name": "Renewable Energy Track", "session_type": "technical", "domain": "Renewable Energy & Sustainability",
         "description": "Technical papers on renewable energy", "time_slot": "11:00-13:00", "capacity": 150},
        {"name": "Environmental Science Track", "session_type": "technical", "domain": "Environmental Science & Climate",
         "description": "Technical papers on environmental science", "time_slot": "14:00-16:00", "capacity": 150},
        {"name": "Student Research Symposium", "session_type": "student_research", "domain": None,
         "description": "Student research presentations", "time_slot": "14:00-16:00", "capacity": 100},
        {"name": "AI & Data Science Workshop", "session_type": "workshop", "domain": None,
         "description": "Hands-on workshop on AI applications", "time_slot": "16:30-18:00", "capacity": 50},
        {"name": "Expert Panel Discussion", "session_type": "panel", "domain": None,
         "description": "Panel discussion on future of science", "time_slot": "16:30-18:00", "capacity": 200},
        {"name": "Valedictory Session", "session_type": "keynote", "domain": None,
         "description": "Closing ceremony and awards", "time_slot": "18:30-20:00", "capacity": 500},
    ]
    
    for s_data in sessions_data:
        session = TechnicalSession(**s_data)
        db.add(session)
    
    # --- 6 Judges ---
    judges_data = [
        {"name": "Dr. Rajesh Kumar", "email": "rajesh.kumar@iitd.edu", "institution": "IIT Delhi",
         "specialization": "Mining & Earth Observation", "bio": "Expert in remote sensing"},
        {"name": "Prof. Anita Sharma", "email": "anita.sharma@iisc.edu", "institution": "IISc Bangalore",
         "specialization": "Renewable Energy & Sustainability", "bio": "Solar energy researcher"},
        {"name": "Dr. Vikram Patel", "email": "vikram.patel@terii.edu", "institution": "TERI",
         "specialization": "Environmental Science & Climate", "bio": "Climate policy expert"},
        {"name": "Prof. Meera Nair", "email": "meera.nair@iitm.edu", "institution": "IIT Madras",
         "specialization": "Mining & Earth Observation", "bio": "Geophysics specialist"},
        {"name": "Dr. Suresh Reddy", "email": "suresh.reddy@csir.edu", "institution": "CSIR",
         "specialization": "Renewable Energy & Sustainability", "bio": "Wind energy expert"},
        {"name": "Prof. Kavita Singh", "email": "kavita.singh@du.ac.in", "institution": "Delhi University",
         "specialization": "Environmental Science & Climate", "bio": "Biodiversity researcher"},
    ]
    
    for j_data in judges_data:
        judge = TechnicalJudge(**j_data)
        db.add(judge)
    
    # --- 3 Rubrics with Criteria ---
    # Paper Presentation Rubric
    paper_rubric = EvaluationRubric(
        name="Paper Presentation Rubric",
        category="presentation",
        description="Evaluation criteria for research paper presentations",
        total_score=100.0, passing_threshold=50.0
    )
    db.add(paper_rubric)
    db.flush()
    
    paper_criteria = [
        {"rubric_id": paper_rubric.id, "name": "Content Quality", "description": "Depth and originality of research",
         "max_score": 30, "weight": 1.0, "order_index": 1},
        {"rubric_id": paper_rubric.id, "name": "Presentation Skills", "description": "Clarity and engagement",
         "max_score": 25, "weight": 1.0, "order_index": 2},
        {"rubric_id": paper_rubric.id, "name": "Methodology", "description": "Soundness of research methods",
         "max_score": 20, "weight": 1.0, "order_index": 3},
        {"rubric_id": paper_rubric.id, "name": "Q&A Handling", "description": "Ability to answer questions",
         "max_score": 15, "weight": 1.0, "order_index": 4},
        {"rubric_id": paper_rubric.id, "name": "Visual Aids", "description": "Quality of slides/materials",
         "max_score": 10, "weight": 1.0, "order_index": 5},
    ]
    for c in paper_criteria:
        db.add(RubricCriterion(**c))
    
    # Student Research Rubric
    student_rubric = EvaluationRubric(
        name="Student Research Rubric",
        category="student_research",
        description="Evaluation criteria for student research presentations",
        total_score=100.0, passing_threshold=40.0
    )
    db.add(student_rubric)
    db.flush()
    
    student_criteria = [
        {"rubric_id": student_rubric.id, "name": "Research Question", "description": "Clarity and significance",
         "max_score": 20, "weight": 1.0, "order_index": 1},
        {"rubric_id": student_rubric.id, "name": "Literature Review", "description": "Comprehensiveness",
         "max_score": 20, "weight": 1.0, "order_index": 2},
        {"rubric_id": student_rubric.id, "name": "Methodology", "description": "Appropriateness of methods",
         "max_score": 20, "weight": 1.0, "order_index": 3},
        {"rubric_id": student_rubric.id, "name": "Analysis & Results", "description": "Quality of findings",
         "max_score": 25, "weight": 1.0, "order_index": 4},
        {"rubric_id": student_rubric.id, "name": "Presentation", "description": "Clarity and confidence",
         "max_score": 15, "weight": 1.0, "order_index": 5},
    ]
    for c in student_criteria:
        db.add(RubricCriterion(**c))
    
    # Technical Challenge Rubric
    challenge_rubric = EvaluationRubric(
        name="Technical Challenge Rubric",
        category="technical_challenge",
        description="Evaluation criteria for technical challenge solutions",
        total_score=100.0, passing_threshold=60.0
    )
    db.add(challenge_rubric)
    db.flush()
    
    challenge_criteria = [
        {"rubric_id": challenge_rubric.id, "name": "Innovation", "description": "Originality of solution",
         "max_score": 25, "weight": 1.0, "order_index": 1},
        {"rubric_id": challenge_rubric.id, "name": "Technical Implementation", "description": "Quality of implementation",
         "max_score": 25, "weight": 1.0, "order_index": 2},
        {"rubric_id": challenge_rubric.id, "name": "Problem Solving", "description": "Addresses the challenge",
         "max_score": 20, "weight": 1.0, "order_index": 3},
        {"rubric_id": challenge_rubric.id, "name": "Scalability", "description": "Potential for scale",
         "max_score": 15, "weight": 1.0, "order_index": 4},
        {"rubric_id": challenge_rubric.id, "name": "Presentation & Demo", "description": "Quality of demo",
         "max_score": 10, "weight": 1.0, "order_index": 5},
        {"rubric_id": challenge_rubric.id, "name": "Team Collaboration", "description": "Teamwork evidence",
         "max_score": 5, "weight": 1.0, "order_index": 6},
    ]
    for c in challenge_criteria:
        db.add(RubricCriterion(**c))
    
    # --- 2 Technical Challenges ---
    challenges_data = [
        {"name": "AI for Sustainability Challenge", "domain": "Renewable Energy & Sustainability",
         "description": "Develop AI solutions for sustainability problems",
         "min_team_size": 3, "max_team_size": 5, "time_slot": "Full Day"},
        {"name": "Smart Mining Innovation Challenge", "domain": "Mining & Earth Observation",
         "description": "Innovative solutions for smart mining operations",
         "min_team_size": 2, "max_team_size": 4, "time_slot": "Full Day"},
    ]
    
    for c_data in challenges_data:
        challenge = TechnicalChallenge(**c_data)
        db.add(challenge)
    
    # --- 4 Demos ---
    demos_data = [
        {"name": "Solar Panel Efficiency Demo", "presenter_name": "Green Energy Lab",
         "domain": "Renewable Energy & Sustainability", "booth_number": "D-01"},
        {"name": "Drone-based Mining Survey", "presenter_name": "GeoTech Solutions",
         "domain": "Mining & Earth Observation", "booth_number": "D-02"},
        {"name": "Air Quality Monitoring System", "presenter_name": "EcoSense Team",
         "domain": "Environmental Science & Climate", "booth_number": "D-03"},
        {"name": "Water Purification Prototype", "presenter_name": "AquaTech Innovations",
         "domain": "Environmental Science & Climate", "booth_number": "D-04"},
    ]
    
    for d_data in demos_data:
        demo = TechnicalDemo(**d_data)
        db.add(demo)
    
    db.commit()
    
    log_action(db, current_user, "technical_data_seeded", "system", None,
               {"sessions": 8, "judges": 6, "rubrics": 3, "challenges": 2, "demos": 4},
               request.client.host if request.client else None)
    
    return {
        "message": "Technical data seeded successfully",
        "counts": {"sessions": 8, "judges": 6, "rubrics": 3, "challenges": 2, "demos": 4}
    }
