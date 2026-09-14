"""
API Routes for NYSC-2026 Conference
Authentication, Registration, Admin, Committees, Payments, Gallery, Announcements
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os

from ..core.database import get_db
from ..core import security
from .. import schemas, crud
from ..models import User, UserRole

router = APIRouter()

# === AUTHENTICATION ROUTES ===
@router.post("/auth/login", response_model=schemas.Token)
async def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=login_data.email)
    if not user or not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=schemas.UserResponse)
async def get_current_user_info(current_user: User = Depends(security.get_current_user)):
    return current_user

# === REGISTRATION ROUTES (SIMPLIFIED) ===
@router.post("/register", response_model=schemas.RegistrationResponse)
async def register(
    phone_number: str = Form(...),
    institution: str = Form(...),
    designation: str = Form(...),
    city: str = Form(...),
    state: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(security.get_current_user)
):
    # Check if already registered
    existing = crud.get_registration_by_user_id(db, current_user.id)
    if existing:
        raise HTTPException(status_code=400, detail="Already registered")
    
    registration_data = schemas.RegistrationCreate(
        phone_number=phone_number,
        institution=institution,
        designation=designation,
        city=city,
        state=state
    )
    
    new_registration = crud.create_registration(db, registration_data, current_user.id)
    
    # Handle photo upload if provided
    photo_path = None
    if photo:
        photo_filename = f"{uuid.uuid4()}_{photo.filename}"
        photo_dir = "app/uploads/photos"
        os.makedirs(photo_dir, exist_ok=True)
        photo_path = f"{photo_dir}/{photo_filename}"
        
        with open(photo_path, "wb") as buffer:
            buffer.write(await photo.read())
        
        crud.update_registration_photo(db, new_registration.id, photo_path)
    
    return new_registration

@router.get("/registration/my-status", response_model=schemas.RegistrationResponse)
async def get_my_registration_status(
    current_user: User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    registration = crud.get_registration_by_user_id(db, current_user.id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    return registration

# === QR SCAN ROUTE (VOLUNTEER/COMMITTEE ONLY) ===
@router.post("/scan-qr", response_model=schemas.QRScanResult)
async def scan_qr_code(
    qr_data: dict,  # {user_id: int}
    current_user: User = Depends(security.check_role_permission([
        UserRole.VOLUNTEER,
        UserRole.COMMITTEE_MEMBER,
        UserRole.ADMIN,
        UserRole.SUPER_USER
    ])),
    db: Session = Depends(get_db)
):
    user_id = qr_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    scanned_user = db.query(User).filter(User.id == user_id).first()
    if not scanned_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    registration = crud.get_registration_by_user_id(db, user_id)
    
    # Meal eligibility logic (delegates only restricted by timing)
    meal_eligible = True
    if scanned_user.role == UserRole.DELEGATE:
        # Check meal timing from settings
        settings = crud.get_or_create_settings(db)
        # Implement time check logic here
        pass
    
    return schemas.QRScanResult(
        user_id=scanned_user.id,
        full_name=scanned_user.full_name,
        role=scanned_user.role,
        photo_path=registration.photo_path if registration else None,  # Visible to scanner only
        checked_in=registration.checked_in if registration else False,
        meal_eligible=meal_eligible,
        institution=registration.institution if registration else "N/A"
    )

# === ADMIN: COMMITTEE INVITES ===
@router.post("/admin/committee/invite", response_model=schemas.CommitteeInviteResponse)
async def invite_committee_member(
    invite_data: schemas.CommitteeInviteCreate,
    current_user: User = Depends(security.check_admin_or_higher),
    db: Session = Depends(get_db)
):
    token = str(uuid.uuid4())
    new_invite = crud.create_committee_invite(db, invite_data, current_user.id, token)
    # Send email with token link (implement email service)
    return new_invite

@router.get("/admin/committee/invites", response_model=List[schemas.CommitteeInviteResponse])
async def get_all_invites(
    current_user: User = Depends(security.check_admin_or_higher),
    db: Session = Depends(get_db)
):
    return db.query(models.CommitteeInvite).all()

# === ADMIN: MANUAL ID CARDS (GUEST SLOTS) ===
@router.post("/admin/id-cards/guest", response_model=schemas.ManualIdCardResponse)
async def create_guest_id_card(
    card_data: schemas.ManualIdCardCreate,
    current_user: User = Depends(security.check_super_user),  # Only Super Users can issue guest cards
    db: Session = Depends(get_db)
):
    # Check slot quota
    if current_user.guest_slots_used >= current_user.guest_slot_quota:
        raise HTTPException(status_code=400, detail="Guest slot quota exceeded")
    
    qr_code = str(uuid.uuid4())
    new_card = crud.create_manual_id_card(db, card_data, current_user.id, qr_code)
    return new_card

@router.get("/admin/id-cards/guest", response_model=List[schemas.ManualIdCardResponse])
async def get_guest_cards(
    current_user: User = Depends(security.check_super_user),
    db: Session = Depends(get_db)
):
    return crud.get_manual_id_cards_by_issuer(db, current_user.id)

@router.put("/admin/id-cards/guest/{card_id}", response_model=schemas.ManualIdCardResponse)
async def update_guest_id_card(
    card_id: int,
    updates: dict,
    current_user: User = Depends(security.check_super_user),
    db: Session = Depends(get_db)
):
    updated_card = crud.update_manual_id_card(db, card_id, updates)
    return updated_card

# === ANNOUNCEMENTS (HEAD OF WEBSITE CAN PUSH UPDATES) ===
@router.post("/announcements", response_model=schemas.AnnouncementResponse)
async def create_announcement(
    announcement_data: schemas.AnnouncementCreate,
    current_user: User = Depends(security.check_role_permission([
        UserRole.HEAD_OF_WEBSITE,
        UserRole.SUPER_USER,
        UserRole.ADMIN
    ])),
    db: Session = Depends(get_db)
):
    new_announcement = crud.create_announcement(db, announcement_data, current_user.id)
    return new_announcement

@router.get("/announcements", response_model=List[schemas.AnnouncementResponse])
async def get_announcements(db: Session = Depends(get_db)):
    return crud.get_live_announcements(db)

# === CONFERENCE SETTINGS (MEAL TIMING, DEADLINES) ===
@router.get("/settings", response_model=schemas.ConferenceSettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    return crud.get_or_create_settings(db)

@router.put("/settings", response_model=schemas.ConferenceSettingsResponse)
async def update_settings(
    settings_data: schemas.ConferenceSettingsUpdate,
    current_user: User = Depends(security.check_admin_or_higher),
    db: Session = Depends(get_db)
):
    return crud.update_settings(db, settings_data)

# === PAYMENTS (SUPER USER ONLY) ===
@router.get("/admin/payments", response_model=List[schemas.PaymentResponse])
async def get_all_payments(
    current_user: User = Depends(security.check_finance_access),
    db: Session = Depends(get_db)
):
    return crud.get_all_payments(db)

# === GALLERY ===
@router.post("/gallery", response_model=schemas.GalleryImageResponse)
async def add_gallery_image(
    caption: Optional[str] = Form(None),
    category: str = Form("venue"),
    display_order: int = Form(0),
    image: UploadFile = File(...),
    current_user: User = Depends(security.check_admin_or_higher),
    db: Session = Depends(get_db)
):
    image_filename = f"{uuid.uuid4()}_{image.filename}"
    image_dir = "app/uploads/gallery"
    os.makedirs(image_dir, exist_ok=True)
    image_path = f"{image_dir}/{image_filename}"
    
    with open(image_path, "wb") as buffer:
        buffer.write(await image.read())
    
    image_data = schemas.GalleryImageCreate(
        caption=caption,
        category=category,
        display_order=display_order
    )
    
    new_image = crud.create_gallery_image(db, image_data, image_path)
    return new_image

@router.get("/gallery", response_model=List[schemas.GalleryImageResponse])
async def get_gallery(db: Session = Depends(get_db)):
    return crud.get_all_gallery_images(db)
