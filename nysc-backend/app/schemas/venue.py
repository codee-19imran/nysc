import uuid
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel

class VenueTaskBase(BaseModel):
    category: str
    task_name: str
    description: Optional[str] = None
    status: str = "not_started"
    priority: str = "medium"
    assigned_to: Optional[uuid.UUID] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None

class VenueTaskCreate(VenueTaskBase):
    pass

class VenueTaskUpdate(BaseModel):
    category: Optional[str] = None
    task_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None

class VenueTaskResponse(VenueTaskBase):
    id: uuid.UUID
    completed_at: Optional[datetime] = None
    completed_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assigned_user_name: Optional[str] = None

    class Config:
        from_attributes = True

class EquipmentBase(BaseModel):
    name: str
    category: str
    total_quantity: int = 0
    available_quantity: int = 0
    booked_quantity: int = 0
    condition: str = "good"
    location: Optional[str] = None
    notes: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    booked_quantity: Optional[int] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: uuid.UUID
    last_inspected: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RoomAllocationBase(BaseModel):
    room_name: str
    room_number: Optional[str] = None
    capacity: int = 0
    floor: Optional[str] = None
    grid_position: Optional[dict] = None
    allocated_to: Optional[str] = None
    session_type: str = "other"
    time_slot: Optional[str] = None
    special_requirements: Optional[str] = None
    is_confirmed: bool = False

class RoomAllocationCreate(RoomAllocationBase):
    pass

class RoomAllocationUpdate(BaseModel):
    room_name: Optional[str] = None
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    floor: Optional[str] = None
    grid_position: Optional[dict] = None
    allocated_to: Optional[str] = None
    session_type: Optional[str] = None
    time_slot: Optional[str] = None
    special_requirements: Optional[str] = None
    is_confirmed: Optional[bool] = None

class RoomAllocationResponse(RoomAllocationBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class VenueChecklistBase(BaseModel):
    template_name: str
    category: str
    item: str
    is_completed: bool = False
    notes: Optional[str] = None

class VenueChecklistCreate(VenueChecklistBase):
    pass

class VenueChecklistUpdate(BaseModel):
    template_name: Optional[str] = None
    category: Optional[str] = None
    item: Optional[str] = None
    is_completed: Optional[bool] = None
    notes: Optional[str] = None

class VenueChecklistResponse(VenueChecklistBase):
    id: uuid.UUID
    completed_by: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class EventTimelineBase(BaseModel):
    task_name: str
    category: str
    start_time: datetime
    end_time: datetime
    assigned_to: Optional[uuid.UUID] = None
    location: Optional[str] = None
    status: str = "scheduled"
    notes: Optional[str] = None

class EventTimelineCreate(EventTimelineBase):
    pass

class EventTimelineUpdate(BaseModel):
    task_name: Optional[str] = None
    category: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    assigned_to: Optional[uuid.UUID] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class EventTimelineResponse(EventTimelineBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class LogisticsStatsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    not_started_tasks: int
    completion_percentage: float
    total_equipment: int
    available_equipment: int
    total_rooms: int
    allocated_rooms: int
    checklist_progress: float
    days_until_event: Optional[int] = None
