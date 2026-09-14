"""
CRUD operations for NYSC-2026 Database Models
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional, List

from .. import models, schemas

# === USER CRUD ===
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate) -> models.User:
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

# === REGISTRATION CRUD (SIMPLIFIED) ===
def create_registration(db: Session, registration: schemas.RegistrationCreate, user_id: int) -> models.Registration:
    db_registration = models.Registration(
        user_id=user_id,
        **registration.model_dump()
    )
    db.add(db_registration)
    db.commit()
    db.refresh(db_registration)
    return db_registration

def get_registration_by_user_id(db: Session, user_id: int) -> Optional[models.Registration]:
    return db.query(models.Registration).filter(models.Registration.user_id == user_id).first()

def update_registration_photo(db: Session, registration_id: int, photo_path: str) -> models.Registration:
    db_registration = db.query(models.Registration).filter(models.Registration.id == registration_id).first()
    if db_registration:
        db_registration.photo_path = photo_path
        db.commit()
        db.refresh(db_registration)
    return db_registration

def check_in_user(db: Session, user_id: int) -> models.Registration:
    db_registration = db.query(models.Registration).filter(models.Registration.user_id == user_id).first()
    if db_registration:
        db_registration.checked_in = True
        db_registration.check_in_time = datetime.utcnow()
        db.commit()
        db.refresh(db_registration)
    return db_registration

# === COMMITTEE INVITE CRUD ===
def create_committee_invite(db: Session, invite: schemas.CommitteeInviteCreate, inviter_id: int, token: str) -> models.CommitteeInvite:
    db_invite = models.CommitteeInvite(
        email=invite.email,
        role_assigned=invite.role_assigned,
        inviter_id=inviter_id,
        token=token
    )
    db.add(db_invite)
    db.commit()
    db.refresh(db_invite)
    return db_invite

def get_invite_by_token(db: Session, token: str) -> Optional[models.CommitteeInvite]:
    return db.query(models.CommitteeInvite).filter(models.CommitteeInvite.token == token).first()

def accept_invite(db: Session, token: str, user_id: int) -> models.CommitteeInvite:
    db_invite = db.query(models.CommitteeInvite).filter(models.CommitteeInvite.token == token).first()
    if db_invite:
        db_invite.accepted = True
        # Update user role
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if db_user:
            db_user.role = db_invite.role_assigned
        db.commit()
        db.refresh(db_invite)
    return db_invite

# === MANUAL ID CARD CRUD (GUEST) ===
def create_manual_id_card(db: Session, card: schemas.ManualIdCardCreate, issuer_id: int, qr_code: str) -> models.ManualIdCard:
    db_card = models.ManualIdCard(
        guest_name=card.guest_name,
        guest_organization=card.guest_organization,
        invited_on_behalf_of=card.invited_on_behalf_of,
        qr_code_data=qr_code,
        issuer_id=issuer_id
    )
    
    # Increment issuer's used slots
    issuer = db.query(models.User).filter(models.User.id == issuer_id).first()
    if issuer:
        issuer.guest_slots_used += 1
    
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

def get_manual_id_cards_by_issuer(db: Session, issuer_id: int) -> List[models.ManualIdCard]:
    return db.query(models.ManualIdCard).filter(models.ManualIdCard.issuer_id == issuer_id).all()

def update_manual_id_card(db: Session, card_id: int, updates: dict) -> models.ManualIdCard:
    db_card = db.query(models.ManualIdCard).filter(models.ManualIdCard.id == card_id).first()
    if db_card:
        for key, value in updates.items():
            setattr(db_card, key, value)
        db.commit()
        db.refresh(db_card)
    return db_card

# === PAPER SUBMISSION CRUD ===
def create_paper_submission(db: Session, paper: schemas.PaperSubmissionCreate, user_id: int, file_path: str) -> models.PaperSubmission:
    db_paper = models.PaperSubmission(
        title=paper.title,
        abstract=paper.abstract,
        user_id=user_id,
        file_path=file_path
    )
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)
    return db_paper

def get_papers_by_user(db: Session, user_id: int) -> List[models.PaperSubmission]:
    return db.query(models.PaperSubmission).filter(models.PaperSubmission.user_id == user_id).all()

# === ANNOUNCEMENT CRUD ===
def create_announcement(db: Session, announcement: schemas.AnnouncementCreate, created_by: int) -> models.Announcement:
    db_announcement = models.Announcement(
        title=announcement.title,
        content=announcement.content,
        is_live=announcement.is_live,
        created_by=created_by
    )
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement

def get_live_announcements(db: Session) -> List[models.Announcement]:
    return db.query(models.Announcement).filter(models.Announcement.is_live == True).order_by(models.Announcement.created_at.desc()).all()

# === CONFERENCE SETTINGS CRUD ===
def get_or_create_settings(db: Session) -> models.ConferenceSettings:
    settings = db.query(models.ConferenceSettings).first()
    if not settings:
        settings = models.ConferenceSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_settings(db: Session, settings_update: schemas.ConferenceSettingsUpdate) -> models.ConferenceSettings:
    settings = get_or_create_settings(db)
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings

# === GALLERY CRUD ===
def create_gallery_image(db: Session, image: schemas.GalleryImageCreate, image_path: str) -> models.GalleryImage:
    db_image = models.GalleryImage(
        image_path=image_path,
        caption=image.caption,
        category=image.category,
        display_order=image.display_order
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_all_gallery_images(db: Session) -> List[models.GalleryImage]:
    return db.query(models.GalleryImage).order_by(models.GalleryImage.display_order).all()

# === PAYMENT CRUD (SUPER USER ONLY) ===
def get_all_payments(db: Session) -> List[models.Payment]:
    return db.query(models.Payment).all()

def get_payment_by_registration(db: Session, registration_id: int) -> Optional[models.Payment]:
    return db.query(models.Payment).filter(models.Payment.registration_id == registration_id).first()
