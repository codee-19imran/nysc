import uuid
import os
import shutil
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request
from fastapi.responses import FileResponse
from typing import Optional, List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.input_validation import validate_file_type
from app.core.security_config import SecurityConfig

from app.models.paper import Paper, PaperStatus, PaperDomain
from app.models.registration import Registration, ParticipationType, PaymentStatus
from app.models.review import Review, ReviewDecision
from app.models.user import User
from app.schemas.paper import (
    PaperOut,
    PaperAdminOut,
    AuthorInfo,
    AssignReviewersRequest,
    ReviewSubmitRequest,
    ReviewOut,
    PaperStatusUpdate,
)
from app.services import file_service

router = APIRouter(tags=["papers"])

def _paper_to_admin_out(db: Session, paper: Paper) -> PaperAdminOut:
    # Author is the owner of the registration
    registration = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    authors = []
    if registration:
        u = db.query(User).filter(User.id == registration.user_id).first()
        if u:
            authors.append(AuthorInfo(user_id=u.id, name=u.name, email=u.email))
            
    return PaperAdminOut(
        id=paper.id,
        title=paper.title,
        domain=paper.domain,
        abstract=paper.abstract,
        file_url=paper.file_url,
        review_status=paper.review_status,
        created_at=paper.created_at,
        registration_id=paper.registration_id,
        assigned_reviewer_id=paper.assigned_reviewer_id,
        decision=paper.decision,
        comments_for_authors=paper.comments_for_authors,
        reviewed_at=paper.reviewed_at,
        authors=authors,
    )


from app.services.deadline_service import check_paper_deadline

@router.post("/papers", response_model=PaperAdminOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def submit_paper(
    request: Request,
    title: str = Form(...),
    domain: PaperDomain = Form(...),
    abstract: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ✅ ENFORCE DEADLINE FIRST
    deadline_check = check_paper_deadline(db)
    if not deadline_check["open"]:
        raise HTTPException(
            status_code=403,
            detail=deadline_check["message"]
        )
    registration = db.query(Registration).filter(Registration.user_id == user.id).first()
    if not registration:
        raise HTTPException(
            status_code=404, detail="No registration found. Please complete Step 1 first."
        )
    if registration.participation_type != ParticipationType.presenter:
        raise HTTPException(
            status_code=403,
            detail="Only delegates registered as 'presenter' can submit papers. "
            "Update your registration's participation type first.",
        )

    stored_filename = None
    if file is not None:
        if registration.payment_status != PaymentStatus.paid:
            raise HTTPException(
                status_code=400, 
                detail="Complete your conference registration payment before submitting the full paper PDF."
            )
        try:
            stored_filename = file_service.save_paper_file(file)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    paper = Paper(
        registration_id=registration.id,
        title=title,
        domain=domain.value if hasattr(domain, 'value') else domain,
        abstract=abstract,
        file_url=stored_filename,
        review_status=PaperStatus.submitted.value,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return _paper_to_admin_out(db, paper)


@router.get("/papers/mine", response_model=list[PaperAdminOut])
def list_my_papers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reg = db.query(Registration).filter(Registration.user_id == user.id).first()
    if not reg:
        return []
    papers = db.query(Paper).filter(Paper.registration_id == reg.id).all()
    return [_paper_to_admin_out(db, p) for p in papers]


@router.get("/papers", response_model=list[PaperAdminOut])
@require_permission("paper:view_all")
def list_all_papers(
    domain: PaperDomain | None = None,
    paper_status: PaperStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Paper)
    if domain:
        query = query.filter(Paper.domain == (domain.value if hasattr(domain, 'value') else domain))
    if paper_status:
        query = query.filter(Paper.review_status == (paper_status.value if hasattr(paper_status, 'value') else paper_status))
    return [_paper_to_admin_out(db, p) for p in query.all()]


@router.get("/papers/me", response_model=PaperAdminOut)
def get_my_paper(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    reg = db.query(Registration).filter(Registration.user_id == user.id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="No registration found")
    
    paper = db.query(Paper).filter(Paper.registration_id == reg.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="No paper draft found. Please complete Step 2 of registration.")
    
    return _paper_to_admin_out(db, paper)


@router.get("/papers/{paper_id}", response_model=PaperOut)
def get_paper_for_review(
    paper_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Double-blind view: returns title/abstract/domain/file only — never author identity.
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # If the user is the author
    reg = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    if reg and reg.user_id == user.id:
        return paper

    # If the user is assigned as a reviewer to this paper
    assigned = db.query(Review).filter(Review.paper_id == paper.id, Review.reviewer_id == user.id).first()
    if assigned:
        return paper
        
    # Check if admin with view_all permission
    from app.core.permissions import has_permission
    if has_permission(str(user.id), "paper:view_all", db, user_role=user.role.value):
        return paper

    raise HTTPException(status_code=403, detail="You don't have access to this paper")


@router.get("/papers/{paper_id}/download")
def download_paper_file(
    paper_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    allowed = False
    
    # Author
    reg = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    if reg and reg.user_id == user.id:
        allowed = True
        
    # Reviewer
    if not allowed:
        assigned = db.query(Review).filter(Review.paper_id == paper.id, Review.reviewer_id == user.id).first()
        if assigned:
            allowed = True
            
    # Admin
    if not allowed:
        from app.core.permissions import has_permission
        if has_permission(str(user.id), "paper:view_all", db, user_role=user.role.value):
            allowed = True
            
    if not allowed:
        raise HTTPException(status_code=403, detail="You don't have access to this file")

    if not paper.file_url:
        raise HTTPException(status_code=404, detail="Paper file not uploaded")

    path = file_service.get_paper_file_path(paper.file_url)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(path, filename=os.path.basename(path))


@router.post("/papers/{paper_id}/assign-reviewers", response_model=list[ReviewOut])
@require_permission("paper:assign")
def assign_reviewers(
    paper_id: uuid.UUID,
    payload: AssignReviewersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    target_reviewer = db.query(User).filter(User.id == payload.reviewer_id).first()
    if not target_reviewer:
        raise HTTPException(status_code=404, detail="Reviewer not found")

    existing = db.query(Review).filter(Review.paper_id == paper.id, Review.reviewer_id == target_reviewer.id).first()
    if existing:
        return [existing]
        
    review = Review(paper_id=paper.id, reviewer_id=target_reviewer.id)
    db.add(review)

    paper.assigned_reviewer_id = target_reviewer.id
    paper.review_status = PaperStatus.under_review.value
    db.commit()
    db.refresh(review)
    return [review]


@router.get("/reviews/assigned", response_model=list[ReviewOut])
@require_permission("paper:view_assigned")
def list_my_assigned_reviews(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return db.query(Review).filter(Review.reviewer_id == current_user.id).all()


@router.post("/reviews/{review_id}/submit", response_model=ReviewOut)
@require_permission("paper:review")
def submit_review(
    review_id: uuid.UUID,
    payload: ReviewSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.id == review_id, Review.reviewer_id == current_user.id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review assignment not found or not yours")

    review.decision = payload.decision.value if hasattr(payload.decision, 'value') else payload.decision
    review.comments_for_authors = payload.comments_for_authors
    review.confidential_comments = payload.confidential_comments
    
    from sqlalchemy import func as sa_func
    review.updated_at = sa_func.now()
    db.commit()
    db.refresh(review)
    return review


@router.get("/papers/{paper_id}/reviews", response_model=list[ReviewOut])
@require_permission("paper:view_all")
def get_paper_reviews(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Review).filter(Review.paper_id == paper_id).all()


@router.patch("/papers/{paper_id}/status", response_model=PaperAdminOut)
@require_permission("paper:view_all")
def update_paper_status(
    paper_id: uuid.UUID,
    payload: PaperStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.review_status = payload.status
    db.commit()
    db.refresh(paper)
    return _paper_to_admin_out(db, paper)


from app.services.file_validation import process_uploaded_file

@router.put("/papers/{paper_id}")
@limiter.limit("5/hour")
async def upload_paper_file(
    request: Request,
    paper_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    reg = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    if reg.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload to this paper")

    if reg.payment_status != PaymentStatus.paid:
        raise HTTPException(status_code=400, detail="You must complete payment before uploading the full paper.")

    # Enforce paper submission deadline
    from app.services.deadline_service import check_paper_deadline
    deadline_status = check_paper_deadline(db)
    if not deadline_status["open"]:
        raise HTTPException(status_code=403, detail=deadline_status["message"])
        
    content = await file.read()
    
    # Validate and process
    success, error, processed_content, _ = await process_uploaded_file(
        file_content=content,
        filename=file.filename,
        expected_mime="application/pdf",
        max_size_mb=SecurityConfig.MAX_UPLOAD_SIZE_MB,
        user_id=user.id,
        strip_exif=False  # PDFs don't have EXIF
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=error)

    upload_dir = "static/papers"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Keep the deterministic filename to automatically overwrite old versions
    file_extension = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{paper_id}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename).replace("\\", "/")
    
    with open(file_path, "wb") as buffer:
        buffer.write(processed_content)

    paper.file_url = file_path
    db.commit()
    
    return {"message": "Paper uploaded successfully", "file_url": paper.file_url}


from app.schemas.admin import PaperMetadataUpdate
from app.models.paper import CoAuthor

@router.patch("/papers/{paper_id}")
def update_paper_details(
    paper_id: uuid.UUID,
    payload: PaperMetadataUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Security check
    reg = db.query(Registration).filter(Registration.id == paper.registration_id).first()
    if reg.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    paper.title = payload.title
    paper.abstract = payload.abstract
    paper.domain = payload.domain
    
    # Update co-authors if provided in payload (even if empty list)
    if payload.co_author_emails is not None:
        # Delete existing co-authors
        db.query(CoAuthor).filter(CoAuthor.paper_id == paper_id).delete()
        
        # Add new co-authors
        for email in payload.co_author_emails:
            if email.strip():
                co_author = CoAuthor(paper_id=paper_id, email=email.strip())
                db.add(co_author)
    
    db.commit()
    db.refresh(paper)
    
    return {"message": "Paper details updated", "paper_id": str(paper.id)}
