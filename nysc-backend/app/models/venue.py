import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TaskCategory(str, enum.Enum):
    venue = "venue"
    infrastructure = "infrastructure"
    event_day = "event_day"


class TaskStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"


class TaskPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class EquipmentCondition(str, enum.Enum):
    excellent = "excellent"
    good = "good"
    needs_repair = "needs_repair"
    broken = "broken"


class SessionType(str, enum.Enum):
    technical = "technical"
    keynote = "keynote"
    workshop = "workshop"
    exhibition = "exhibition"
    registration = "registration"
    other = "other"


class VenueTask(Base):
    __tablename__ = "venue_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    category = Column(Enum(TaskCategory), nullable=False, index=True)
    task_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.not_started, nullable=False, index=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.medium, nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    total_quantity = Column(Integer, default=0, nullable=False)
    available_quantity = Column(Integer, default=0, nullable=False)
    booked_quantity = Column(Integer, default=0, nullable=False)
    condition = Column(Enum(EquipmentCondition), default=EquipmentCondition.good, nullable=False)
    location = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    last_inspected = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomAllocation(Base):
    __tablename__ = "room_allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    room_name = Column(String(255), nullable=False)
    room_number = Column(String(50), nullable=True)
    capacity = Column(Integer, default=0, nullable=False)
    floor = Column(String(50), nullable=True)
    grid_position = Column(JSON, nullable=True)  # {row: 1, col: 2} for grid layout
    allocated_to = Column(String(255), nullable=True)
    session_type = Column(Enum(SessionType), default=SessionType.other, nullable=True)
    time_slot = Column(String(100), nullable=True)
    special_requirements = Column(Text, nullable=True)
    is_confirmed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class VenueChecklist(Base):
    __tablename__ = "venue_checklists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    template_name = Column(String(255), nullable=False)  # e.g., "Pre-Event", "Event-Day Morning"
    category = Column(String(100), nullable=False, index=True)
    item = Column(String(500), nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class EventTimeline(Base):
    __tablename__ = "event_timeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    task_name = Column(String(255), nullable=False)
    category = Column(Enum(TaskCategory), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="scheduled", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
