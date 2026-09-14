"""
Database Models for NYSC-2026 Conference
Updated Schema: Removed paper fields from Registration, Added Committee Role, Guest Slots, Double-Blind Review
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    SUPER_USER = "super_user"
    ADMIN = "admin"
    HEAD_OF_WEBSITE = "head_of_website"
    COMMITTEE_MEMBER = "committee_member"
    VOLUNTEER = "volunteer"
    DELEGATE = "delegate"
    GUEST = "guest"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.DELEGATE)
    
    # Flexible permissions for Head of Website
    extra_permissions = Column(Text, default="[]")  # JSON list of allowed sections
    
    # Guest Slot Quota (for Super Users)
    guest_slot_quota = Column(Integer, default=0)
    guest_slots_used = Column(Integer, default=0)
    
    # Template Preference (for different dashboard views)
    template_preference = Column(String, default="default")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    registration = relationship("Registration", back_populates="user", uselist=False)
    committee_invite = relationship("CommitteeInvite", back_populates="inviter")
    guest_cards_issued = relationship("ManualIdCard", back_populates="issuer")

class Registration(Base):
    __tablename__ = "registrations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    user = relationship("User", back_populates="registration")
    
    # Kept Fields
    phone_number = Column(String)
    institution = Column(String)
    designation = Column(String)
    city = Column(String)
    state = Column(String)
    
    # REMOVED: field_of_study, stream, paper_details, co_authors
    
    # Photo Upload (Restricted Visibility)
    photo_path = Column(String)  # Visible ONLY to Admin/Volunteer on scan
    
    # Payment Status
    payment_status = Column(String, default="pending") # pending, success, failed
    transaction_id = Column(String, nullable=True)
    
    # Check-in Status
    checked_in = Column(Boolean, default=False)
    check_in_time = Column(DateTime, nullable=True)
    
    # ID Card Status
    id_card_generated = Column(Boolean, default=False)
    id_card_path = Column(String, nullable=True)

class CommitteeInvite(Base):
    __tablename__ = "committee_invites"
    
    id = Column(Integer, primary_key=True, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id"))
    inviter = relationship("User", back_populates="committee_invite")
    
    email = Column(String, nullable=False)
    role_assigned = Column(Enum(UserRole), default=UserRole.COMMITTEE_MEMBER)
    token = Column(String, unique=True, nullable=False)
    accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ManualIdCard(Base):
    __tablename__ = "manual_id_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    issuer_id = Column(Integer, ForeignKey("users.id"))
    issuer = relationship("User", back_populates="guest_cards_issued")
    
    guest_name = Column(String, nullable=False)
    guest_organization = Column(String, nullable=True)
    invited_on_behalf_of = Column(String, nullable=False) # Editable field
    
    qr_code_data = Column(String, unique=True, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class PaperSubmission(Base):
    __tablename__ = "paper_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User")
    
    title = Column(String, nullable=False)
    abstract = Column(Text)
    file_path = Column(String, nullable=False)
    
    # Double Blind Review Fields
    status = Column(String, default="under_review") # under_review, accepted, rejected
    reviewer_comments = Column(Text, nullable=True) # Hidden from user until decision
    
    submitted_at = Column(DateTime, default=datetime.utcnow)

class ReviewAssignment(Base):
    __tablename__ = "review_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("paper_submissions.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id")) # Must be Committee Member or Admin
    
    # Double Blind Enforcement
    # Reviewer cannot see user_id of submitter via API logic
    # Submitter cannot see reviewer_id
    
    status = Column(String, default="pending") # pending, completed
    recommendation = Column(String, nullable=True) # accept, reject, modify
    comments = Column(Text, nullable=True)

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id")) # Head of Website
    is_live = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConferenceSettings(Base):
    __tablename__ = "conference_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Deadlines
    registration_deadline = Column(DateTime, nullable=True)
    paper_submission_deadline = Column(DateTime, nullable=True)
    
    # Meal Timing (Delegate Only Restriction)
    meal_start_time = Column(String, default="13:00")
    meal_end_time = Column(String, default="14:00")
    
    # Hardcoded Info (Not editable via DB, but stored for reference if needed)
    # Conference Name, Venue, etc. are hardcoded in Frontend config

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"))
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(String, default="initiated")
    gateway_response = Column(Text) # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class GalleryImage(Base):
    __tablename__ = "gallery_images"
    
    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    caption = Column(String)
    category = Column(String) # venue, event, domain
    display_order = Column(Integer, default=0)
