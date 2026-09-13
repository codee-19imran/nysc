from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


# ============ GUESTS ============

class HospitalityGuestBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    designation: Optional[str] = None
    organization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: str = "other"
    arrival_datetime: Optional[datetime] = None
    departure_datetime: Optional[datetime] = None
    accommodation_details: Optional[str] = None
    pickup_required: bool = False
    drop_required: bool = False
    transport_notes: Optional[str] = None
    dietary_requirements: Optional[str] = None
    mobility_requirements: Optional[str] = None
    other_requirements: Optional[str] = None
    protocol_officer: Optional[str] = None
    status: str = "confirmed"
    notes: Optional[str] = None


class HospitalityGuestCreate(HospitalityGuestBase):
    pass


class HospitalityGuestUpdate(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    organization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    arrival_datetime: Optional[datetime] = None
    departure_datetime: Optional[datetime] = None
    accommodation_details: Optional[str] = None
    pickup_required: Optional[bool] = None
    drop_required: Optional[bool] = None
    transport_notes: Optional[str] = None
    dietary_requirements: Optional[str] = None
    mobility_requirements: Optional[str] = None
    other_requirements: Optional[str] = None
    protocol_officer: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class HospitalityGuestResponse(HospitalityGuestBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ MEALS ============

class HospitalityMealBase(BaseModel):
    meal_type: str
    name: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    expected_count: int = 0
    menu_items: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    venue_name: Optional[str] = None
    veg_count: int = 0
    non_veg_count: int = 0
    jain_count: int = 0
    gluten_free_count: int = 0
    water_stations: int = 0
    vendor_name: Optional[str] = None
    vendor_contact: Optional[str] = None
    status: str = "planned"
    notes: Optional[str] = None


class HospitalityMealCreate(HospitalityMealBase):
    pass


class HospitalityMealUpdate(BaseModel):
    meal_type: Optional[str] = None
    name: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    expected_count: Optional[int] = None
    menu_items: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    venue_name: Optional[str] = None
    veg_count: Optional[int] = None
    non_veg_count: Optional[int] = None
    jain_count: Optional[int] = None
    gluten_free_count: Optional[int] = None
    water_stations: Optional[int] = None
    vendor_name: Optional[str] = None
    vendor_contact: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class HospitalityMealResponse(HospitalityMealBase):
    id: uuid.UUID
    room_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ CEREMONIES ============

class HospitalityCeremonyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    ceremony_type: str
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    venue_name: Optional[str] = None
    dignitary_seating: Optional[List[Dict[str, Any]]] = None
    stage_entry_order: Optional[List[Dict[str, Any]]] = None
    stage_exit_order: Optional[List[Dict[str, Any]]] = None
    mementos_list: Optional[List[Dict[str, Any]]] = None
    protocol_checklist: Optional[List[Dict[str, Any]]] = None
    status: str = "planned"
    notes: Optional[str] = None


class HospitalityCeremonyCreate(HospitalityCeremonyBase):
    pass


class HospitalityCeremonyUpdate(BaseModel):
    name: Optional[str] = None
    ceremony_type: Optional[str] = None
    date: Optional[datetime] = None
    time_slot: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    venue_name: Optional[str] = None
    dignitary_seating: Optional[List[Dict[str, Any]]] = None
    stage_entry_order: Optional[List[Dict[str, Any]]] = None
    stage_exit_order: Optional[List[Dict[str, Any]]] = None
    mementos_list: Optional[List[Dict[str, Any]]] = None
    protocol_checklist: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class HospitalityCeremonyResponse(HospitalityCeremonyBase):
    id: uuid.UUID
    room_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ HELP DESK ============

class HelpDeskRequestBase(BaseModel):
    requester_name: str = Field(..., min_length=1, max_length=255)
    requester_email: Optional[str] = None
    requester_phone: Optional[str] = None
    participant_category: Optional[str] = None
    category: str
    priority: str = "medium"
    description: str = Field(..., min_length=1)
    assigned_to: Optional[uuid.UUID] = None
    status: str = "open"
    resolution_notes: Optional[str] = None


class HelpDeskRequestCreate(HelpDeskRequestBase):
    pass


class HelpDeskRequestUpdate(BaseModel):
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_phone: Optional[str] = None
    participant_category: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    status: Optional[str] = None
    resolution_notes: Optional[str] = None


class HelpDeskRequestResponse(HelpDeskRequestBase):
    id: uuid.UUID
    assigned_to_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ MATERIALS ============

class MaterialTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    total_quantity: int = 0
    distributed_count: int = 0
    distribution_venue: Optional[str] = None
    status: str = "ready"
    notes: Optional[str] = None


class MaterialTypeCreate(MaterialTypeBase):
    pass


class MaterialTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    total_quantity: Optional[int] = None
    distributed_count: Optional[int] = None
    distribution_venue: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class MaterialTypeResponse(MaterialTypeBase):
    id: uuid.UUID
    remaining_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ PARTICIPANT ASSISTANCE ============

class ParticipantAssistanceBase(BaseModel):
    registration_id: uuid.UUID
    assisted_at_registration: bool = False
    needs_guidance: bool = False
    movement_group: Optional[str] = None
    notes: Optional[str] = None


class ParticipantAssistanceCreate(ParticipantAssistanceBase):
    pass


class ParticipantAssistanceUpdate(BaseModel):
    assisted_at_registration: Optional[bool] = None
    needs_guidance: Optional[bool] = None
    movement_group: Optional[str] = None
    notes: Optional[str] = None


class ParticipantAssistanceResponse(ParticipantAssistanceBase):
    id: uuid.UUID
    assisted_at: Optional[datetime] = None
    assisted_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ STATS ============

class HospitalityStatsResponse(BaseModel):
    total_participants: int
    students_count: int
    professionals_count: int
    accompanying_count: int
    students_assisted: int
    guests_confirmed: int
    volunteers_active: int
    meals_planned: int
    helpdesk_open: int
    helpdesk_resolved: int
    materials_ready: int
