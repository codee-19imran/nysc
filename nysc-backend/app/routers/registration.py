import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.registration import Registration
from app.models.user import User, UserRole
from app.schemas.registration import RegistrationCreate, RegistrationOut, RegistrationUpdate
from fastapi import Request
from app.core.audit import log_action

router = APIRouter(prefix="/registrations", tags=["registrations"])


from app.services.deadline_service import check_registration_deadline

@router.post("", response_model=RegistrationOut, status_code=status.HTTP_201_CREATED)
def create_registration(
    payload: RegistrationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ✅ ENFORCE DEADLINE FIRST
    deadline_check = check_registration_deadline(db)
    if not deadline_check["open"]:
        raise HTTPException(
            status_code=403,
            detail=deadline_check["message"]
        )
    existing = db.query(Registration).filter(Registration.user_id == user.id).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="You already have a registration on file"
        )

    # Determine participation_type from sub_category if applicable
    part_type = payload.participation_type
    if payload.sub_category == "presenter":
        part_type = "presenter"
    elif payload.sub_category == "attendee":
        part_type = "attendee"

    registration = Registration(
        user_id=user.id,
        category=payload.category,
        participation_type=part_type,
        sub_category=payload.sub_category,
        education_level=payload.education_level,
        student_class=payload.student_class,
        field_of_study=payload.field_of_study,
        graduation_year=payload.graduation_year,
        organization=payload.organization,
        designation=payload.designation,
        experience=payload.experience,
        state=payload.state,
        city=payload.city,
        paper_title=payload.paper_title,
        co_authors=payload.co_authors,
        accompanying_count=payload.accompanying_count,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.get("/me", response_model=RegistrationOut)
def get_my_registration(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    registration = db.query(Registration).filter(Registration.user_id == user.id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="No registration found for this account")
    
    # Map the unified User QR back into the registration response for the frontend
    registration.qr_hash = user.qr_hash
    
    return registration


@router.get("", response_model=list[RegistrationOut])
@require_permission("user:view")
def list_registrations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return db.query(Registration).all()


@router.get("/{registration_id}", response_model=RegistrationOut)
@require_permission("user:view")
def get_registration(
    registration_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    return registration


@router.put("/update")
async def update_registration(
    payload: RegistrationUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update registration — delegates CANNOT edit, only Super Admin/Website Head."""
    # Check permission: only Super Admin or Website Head
    if current_user.role not in [UserRole.super_admin, UserRole.website_head]:
        raise HTTPException(
            status_code=403, 
            detail="Registration data is locked after submission. Contact admin for changes."
        )
    
    # Find registration
    reg = db.query(Registration).filter(Registration.user_id == payload.user_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Update allowed fields
    for key, value in payload.dict(exclude_unset=True).items():
        if key != 'user_id':  # Don't allow changing user
            setattr(reg, key, value)
    
    db.commit()
    
    log_action(db, current_user, "registration_updated_by_admin", "registration", reg.id,
               {"changes": list(payload.dict(exclude_unset=True).keys())},
               request.client.host if request.client else None)
    
    return {"message": "Registration updated"}
