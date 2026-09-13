import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ============ ENUMS ============

class GuestCategory(str, enum.Enum):
    chief_guest = "chief_guest"
    speaker = "speaker"
    sponsor = "sponsor"
    media = "media"
    other = "other"


class GuestStatus(str, enum.Enum):
    confirmed = "confirmed"
    arrived = "arrived"
    departed = "departed"
    cancelled = "cancelled"


class HospitalityMealType(str, enum.Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    refreshment = "refreshment"
    tea = "tea"


class MealStatus(str, enum.Enum):
    planned = "planned"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class CeremonyStatus(str, enum.Enum):
    planned = "planned"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"


class HelpDeskCategory(str, enum.Enum):
    registration = "registration"
    accommodation = "accommodation"
    transport = "transport"
    technical = "technical"
    meals = "meals"
    other = "other"


class HelpDeskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class HelpDeskStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class MaterialStatus(str, enum.Enum):
    ready = "ready"
    distributing = "distributing"
    completed = "completed"


# ============ GUESTS & VIPS ============

class HospitalityGuest(Base):
    __tablename__ = "hospitality_guests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=True)
    organization = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    category = Column(Enum(GuestCategory), default=GuestCategory.other, nullable=False)
    
    # Travel
    arrival_datetime = Column(DateTime(timezone=True), nullable=True)
    departure_datetime = Column(DateTime(timezone=True), nullable=True)
    accommodation_details = Column(Text, nullable=True)
    
    # Transport
    pickup_required = Column(Boolean, default=False)
    drop_required = Column(Boolean, default=False)
    transport_notes = Column(Text, nullable=True)
    
    # Special
    dietary_requirements = Column(String(255), nullable=True)
    mobility_requirements = Column(Text, nullable=True)
    other_requirements = Column(Text, nullable=True)
    
    # Protocol
    protocol_officer = Column(String(255), nullable=True)
    
    status = Column(Enum(GuestStatus), default=GuestStatus.confirmed, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ MEALS & REFRESHMENTS ============

class HospitalityMeal(Base):
    __tablename__ = "hospitality_meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    meal_type = Column(Enum(HospitalityMealType), nullable=False)
    name = Column(String(255), nullable=True)  # e.g., "Day 1 Lunch"
    date = Column(DateTime(timezone=True), nullable=True)
    time_slot = Column(String(100), nullable=True)
    expected_count = Column(Integer, default=0)
    menu_items = Column(Text, nullable=True)
    
    # Location
    room_id = Column(UUID(as_uuid=True), ForeignKey("room_allocations.id"), nullable=True)
    venue_name = Column(String(255), nullable=True)
    
    # Dietary breakdown
    veg_count = Column(Integer, default=0)
    non_veg_count = Column(Integer, default=0)
    jain_count = Column(Integer, default=0)
    gluten_free_count = Column(Integer, default=0)
    
    # Logistics
    water_stations = Column(Integer, default=0)
    vendor_name = Column(String(255), nullable=True)
    vendor_contact = Column(String(100), nullable=True)
    
    status = Column(Enum(MealStatus), default=MealStatus.planned, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ CEREMONIES ============

class HospitalityCeremony(Base):
    __tablename__ = "hospitality_ceremonies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)  # e.g., "Inauguration Ceremony"
    ceremony_type = Column(String(50), nullable=False)  # inauguration / valedictory / other
    date = Column(DateTime(timezone=True), nullable=True)
    time_slot = Column(String(100), nullable=True)
    
    # Location
    room_id = Column(UUID(as_uuid=True), ForeignKey("room_allocations.id"), nullable=True)
    venue_name = Column(String(255), nullable=True)
    
    # Protocol details (JSON)
    dignitary_seating = Column(JSON, nullable=True)  # [{name, designation, seat_number}]
    stage_entry_order = Column(JSON, nullable=True)  # [{order, name, role}]
    stage_exit_order = Column(JSON, nullable=True)
    mementos_list = Column(JSON, nullable=True)  # [{item, recipient, quantity}]
    
    protocol_checklist = Column(JSON, nullable=True)  # [{item, completed, completed_by}]
    
    status = Column(Enum(CeremonyStatus), default=CeremonyStatus.planned, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ HELP DESK ============

class HelpDeskRequest(Base):
    __tablename__ = "help_desk_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    requester_name = Column(String(255), nullable=False)
    requester_email = Column(String(255), nullable=True)
    requester_phone = Column(String(20), nullable=True)
    participant_category = Column(String(50), nullable=True)  # student/professional/guest
    
    category = Column(Enum(HelpDeskCategory), nullable=False)
    priority = Column(Enum(HelpDeskPriority), default=HelpDeskPriority.medium, nullable=False)
    description = Column(Text, nullable=False)
    
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(HelpDeskStatus), default=HelpDeskStatus.open, nullable=False, index=True)
    
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ MATERIALS ============

class MaterialType(Base):
    __tablename__ = "material_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)  # welcome_kit, badge, etc.
    description = Column(Text, nullable=True)
    total_quantity = Column(Integer, default=0, nullable=False)
    distributed_count = Column(Integer, default=0, nullable=False)
    distribution_venue = Column(String(255), nullable=True)
    status = Column(Enum(MaterialStatus), default=MaterialStatus.ready, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ParticipantMaterialCollection(Base):
    """Tracks which materials each participant has collected."""
    __tablename__ = "participant_material_collections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("registrations.id", ondelete="CASCADE"), nullable=False, index=True)
    material_type_id = Column(UUID(as_uuid=True), ForeignKey("material_types.id", ondelete="CASCADE"), nullable=False, index=True)
    collected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    collected_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


# ============ PARTICIPANT ASSISTANCE ============

class ParticipantAssistance(Base):
    """Tracks assistance given to participants at registration (mainly students)."""
    __tablename__ = "participant_assistance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("registrations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    assisted_at_registration = Column(Boolean, default=False, nullable=False)
    assisted_at = Column(DateTime(timezone=True), nullable=True)
    assisted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    needs_guidance = Column(Boolean, default=False, nullable=False)
    movement_group = Column(String(100), nullable=True)  # Group A, B, C, etc.
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
