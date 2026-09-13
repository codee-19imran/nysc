from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.settings import ConferenceSettings


def check_registration_deadline(db: Session) -> dict:
    """
    Check if registration is still open.
    Returns: {"open": bool, "deadline": datetime|None, "message": str}
    """
    settings = db.query(ConferenceSettings).first()
    
    if not settings or not settings.registration_deadline:
        return {"open": True, "deadline": None, "message": "Registration is open"}
    
    now = datetime.now(timezone.utc)
    if now > settings.registration_deadline:
        return {
            "open": False,
            "deadline": settings.registration_deadline,
            "message": f"Registration closed on {settings.registration_deadline.strftime('%B %d, %Y at %I:%M %p')}"
        }
    
    return {"open": True, "deadline": settings.registration_deadline, "message": "Registration is open"}


def check_paper_deadline(db: Session) -> dict:
    """
    Check if paper submission is still open.
    Returns: {"open": bool, "deadline": datetime|None, "message": str}
    """
    settings = db.query(ConferenceSettings).first()
    
    if not settings or not settings.paper_submission_deadline:
        return {"open": True, "deadline": None, "message": "Paper submission is open"}
    
    now = datetime.now(timezone.utc)
    if now > settings.paper_submission_deadline:
        return {
            "open": False,
            "deadline": settings.paper_submission_deadline,
            "message": f"Paper submission closed on {settings.paper_submission_deadline.strftime('%B %d, %Y at %I:%M %p')}"
        }
    
    return {"open": True, "deadline": settings.paper_submission_deadline, "message": "Paper submission is open"}
