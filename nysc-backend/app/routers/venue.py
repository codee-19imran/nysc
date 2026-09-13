from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timezone
import uuid
import csv
import io

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.venue import (
    VenueTask, Equipment, RoomAllocation, 
    VenueChecklist, EventTimeline,
    TaskStatus, TaskCategory
)
from app.schemas.venue import (
    VenueTaskCreate, VenueTaskUpdate, VenueTaskResponse,
    EquipmentCreate, EquipmentUpdate, EquipmentResponse,
    RoomAllocationCreate, RoomAllocationUpdate, RoomAllocationResponse,
    VenueChecklistCreate, VenueChecklistUpdate, VenueChecklistResponse,
    EventTimelineCreate, EventTimelineUpdate, EventTimelineResponse,
    LogisticsStatsResponse
)
from app.models.settings import ConferenceSettings
from fastapi.responses import StreamingResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/venue", tags=["venue"])


# ============ STATS ============

@router.get("/stats", response_model=LogisticsStatsResponse)
@limiter.limit("100/minute")
@require_permission("venue:view")
async def get_logistics_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get logistics dashboard statistics."""
    total_tasks = db.query(VenueTask).count()
    completed = db.query(VenueTask).filter(VenueTask.status == TaskStatus.completed).count()
    in_progress = db.query(VenueTask).filter(VenueTask.status == TaskStatus.in_progress).count()
    blocked = db.query(VenueTask).filter(VenueTask.status == TaskStatus.blocked).count()
    not_started = db.query(VenueTask).filter(VenueTask.status == TaskStatus.not_started).count()
    
    total_equipment = db.query(func.sum(Equipment.total_quantity)).scalar() or 0
    available_equipment = db.query(func.sum(Equipment.available_quantity)).scalar() or 0
    
    total_rooms = db.query(RoomAllocation).count()
    allocated_rooms = db.query(RoomAllocation).filter(RoomAllocation.allocated_to.isnot(None)).count()
    
    total_checklist_items = db.query(VenueChecklist).count()
    completed_checklist = db.query(VenueChecklist).filter(VenueChecklist.is_completed == True).count()
    
    # Days until event
    settings = db.query(ConferenceSettings).first()
    days_until = None
    if settings and settings.conference_dates:
        # Try to parse date from conference_dates string
        try:
            # Simple parsing - adjust based on your date format
            event_date = datetime.strptime(settings.conference_dates.split(',')[0].strip(), "%b %d")
            event_date = event_date.replace(year=2026)
            days_until = (event_date - datetime.now(timezone.utc)).days
        except:
            pass
    
    return LogisticsStatsResponse(
        total_tasks=total_tasks,
        completed_tasks=completed,
        in_progress_tasks=in_progress,
        blocked_tasks=blocked,
        not_started_tasks=not_started,
        completion_percentage=round((completed / total_tasks * 100) if total_tasks > 0 else 0, 1),
        total_equipment=int(total_equipment),
        available_equipment=int(available_equipment),
        total_rooms=total_rooms,
        allocated_rooms=allocated_rooms,
        checklist_progress=round((completed_checklist / total_checklist_items * 100) if total_checklist_items > 0 else 0, 1),
        days_until_event=days_until
    )


@router.get("/assignable-users")
@limiter.limit("100/minute")
@require_permission("venue:assign")
async def get_assignable_users(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users who can be assigned tasks (admins, volunteers, staff)."""
    users = db.query(User).filter(
        User.role.in_([
            UserRole.admin, 
            UserRole.super_admin, 
            UserRole.volunteer,
            UserRole.logistics_head,
            UserRole.technical_head,
            UserRole.hospitality_head,
            UserRole.media_head,
            UserRole.website_head,
        ]),
        User.is_active == 1
    ).all()
    
    # Also include task assignment counts
    result = []
    for user in users:
        task_count = db.query(VenueTask).filter(
            VenueTask.assigned_to == user.id,
            VenueTask.status != TaskStatus.completed
        ).count()
        
        result.append({
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "active_tasks": task_count
        })
    
    return result


# ============ TASKS ============

@router.get("/tasks", response_model=List[VenueTaskResponse])
@limiter.limit("100/minute")
@require_permission("venue:view")
async def get_tasks(
    request: Request,
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all venue tasks with filters."""
    query = db.query(VenueTask)
    if category:
        query = query.filter(VenueTask.category == category)
    if status:
        query = query.filter(VenueTask.status == status)
    
    tasks = query.order_by(VenueTask.created_at.desc()).all()
    
    result = []
    for task in tasks:
        assigned_user = None
        if task.assigned_to:
            assigned_user = db.query(User).filter(User.id == task.assigned_to).first()
        
        result.append(VenueTaskResponse(
            id=task.id,
            category=task.category.value,
            task_name=task.task_name,
            description=task.description,
            status=task.status.value,
            priority=task.priority.value,
            assigned_to=task.assigned_to,
            deadline=task.deadline,
            notes=task.notes,
            completed_at=task.completed_at,
            completed_by=task.completed_by,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assigned_user_name=assigned_user.name if assigned_user else None
        ))
    
    return result


@router.post("/tasks", response_model=VenueTaskResponse)
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def create_task(
    payload: VenueTaskCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new venue task."""
    task = VenueTask(**payload.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    
    log_action(db, current_user, "venue_task_created", "task", task.id,
               {"task_name": task.task_name, "category": task.category.value},
               request.client.host if request.client else None)
    
    return task


@router.put("/tasks/{task_id}", response_model=VenueTaskResponse)
@limiter.limit("60/minute")
@require_permission("venue:edit")
async def update_task(
    task_id: uuid.UUID,
    payload: VenueTaskUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a venue task."""
    task = db.query(VenueTask).filter(VenueTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    # Auto-set completed_at when status changes to completed
    if payload.status == "completed" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        task.completed_by = current_user.id
    
    db.commit()
    db.refresh(task)
    
    log_action(db, current_user, "venue_task_updated", "task", task.id,
               {"changes": list(update_data.keys())},
               request.client.host if request.client else None)
    
    return task


@router.delete("/tasks/{task_id}")
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def delete_task(
    task_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a venue task."""
    task = db.query(VenueTask).filter(VenueTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    
    log_action(db, current_user, "venue_task_deleted", "task", task_id,
               {"task_name": task.task_name},
               request.client.host if request.client else None)
    
    return {"message": "Task deleted"}


# ============ EQUIPMENT ============

@router.get("/equipment", response_model=List[EquipmentResponse])
@limiter.limit("100/minute")
@require_permission("venue:view")
async def get_equipment(
    request: Request,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all equipment."""
    query = db.query(Equipment)
    if category:
        query = query.filter(Equipment.category == category)
    return query.order_by(Equipment.category, Equipment.name).all()


@router.post("/equipment", response_model=EquipmentResponse)
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def create_equipment(
    payload: EquipmentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add new equipment."""
    equipment = Equipment(**payload.dict())
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    
    log_action(db, current_user, "equipment_created", "equipment", equipment.id,
               {"name": equipment.name, "quantity": equipment.total_quantity},
               request.client.host if request.client else None)
    
    return equipment


@router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
@limiter.limit("60/minute")
@require_permission("venue:edit")
async def update_equipment(
    equipment_id: uuid.UUID,
    payload: EquipmentUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update equipment."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(equipment, key, value)
    
    db.commit()
    db.refresh(equipment)
    return equipment


@router.delete("/equipment/{equipment_id}")
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def delete_equipment(
    equipment_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete equipment."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    db.delete(equipment)
    db.commit()
    return {"message": "Equipment deleted"}


# ============ ROOMS ============

@router.get("/rooms", response_model=List[RoomAllocationResponse])
@limiter.limit("100/minute")
@require_permission("venue:view")
async def get_rooms(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rooms."""
    return db.query(RoomAllocation).order_by(RoomAllocation.floor, RoomAllocation.room_name).all()


@router.post("/rooms", response_model=RoomAllocationResponse)
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def create_room(
    payload: RoomAllocationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new room."""
    room = RoomAllocation(**payload.dict())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.put("/rooms/{room_id}", response_model=RoomAllocationResponse)
@limiter.limit("60/minute")
@require_permission("venue:edit")
async def update_room(
    room_id: uuid.UUID,
    payload: RoomAllocationUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update room allocation."""
    room = db.query(RoomAllocation).filter(RoomAllocation.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(room, key, value)
    
    db.commit()
    db.refresh(room)
    return room


@router.delete("/rooms/{room_id}")
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def delete_room(
    room_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a room."""
    room = db.query(RoomAllocation).filter(RoomAllocation.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    db.delete(room)
    db.commit()
    return {"message": "Room deleted"}


# ============ CHECKLISTS ============

@router.get("/checklists", response_model=List[VenueChecklistResponse])
@limiter.limit("100/minute")
@require_permission("venue:checklist")
async def get_checklists(
    request: Request,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all checklists."""
    query = db.query(VenueChecklist)
    if category:
        query = query.filter(VenueChecklist.category == category)
    return query.order_by(VenueChecklist.template_name, VenueChecklist.created_at).all()


@router.post("/checklists", response_model=VenueChecklistResponse)
@limiter.limit("30/minute")
@require_permission("venue:checklist")
async def create_checklist_item(
    payload: VenueChecklistCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a checklist item."""
    item = VenueChecklist(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/checklists/{item_id}", response_model=VenueChecklistResponse)
@limiter.limit("60/minute")
@require_permission("venue:checklist")
async def update_checklist_item(
    item_id: uuid.UUID,
    payload: VenueChecklistUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update checklist item (e.g., mark as complete)."""
    item = db.query(VenueChecklist).filter(VenueChecklist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(item, key, value)
    
    # Auto-set completion metadata
    if payload.is_completed == True and not item.completed_at:
        item.completed_at = datetime.now(timezone.utc)
        item.completed_by = current_user.id
    elif payload.is_completed == False:
        item.completed_at = None
        item.completed_by = None
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklists/{item_id}")
@limiter.limit("30/minute")
@require_permission("venue:checklist")
async def delete_checklist_item(
    item_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a checklist item."""
    item = db.query(VenueChecklist).filter(VenueChecklist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}


# ============ TIMELINE ============

@router.get("/timeline", response_model=List[EventTimelineResponse])
@limiter.limit("100/minute")
@require_permission("venue:view")
async def get_timeline(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get event timeline."""
    return db.query(EventTimeline).order_by(EventTimeline.start_time).all()


@router.post("/timeline", response_model=EventTimelineResponse)
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def create_timeline_event(
    payload: EventTimelineCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a timeline event."""
    event = EventTimeline(**payload.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/timeline/{event_id}", response_model=EventTimelineResponse)
@limiter.limit("60/minute")
@require_permission("venue:edit")
async def update_timeline_event(
    event_id: uuid.UUID,
    payload: EventTimelineUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a timeline event."""
    event = db.query(EventTimeline).filter(EventTimeline.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Timeline event not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(event, key, value)
    
    db.commit()
    db.refresh(event)
    return event


@router.delete("/timeline/{event_id}")
@limiter.limit("30/minute")
@require_permission("venue:edit")
async def delete_timeline_event(
    event_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a timeline event."""
    event = db.query(EventTimeline).filter(EventTimeline.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Timeline event not found")
    
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}


# ============ EXPORTS ============

@router.get("/export/tasks")
@limiter.limit("10/minute")
@require_permission("venue:export")
async def export_tasks_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export tasks to CSV."""
    tasks = db.query(VenueTask).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Category", "Task", "Status", "Priority", "Assigned To", "Deadline", "Notes"])
    
    for t in tasks:
        assigned_user = None
        if t.assigned_to:
            assigned_user = db.query(User).filter(User.id == t.assigned_to).first()
        
        writer.writerow([
            t.category.value,
            t.task_name,
            t.status.value,
            t.priority.value,
            assigned_user.name if assigned_user else "",
            t.deadline.strftime("%Y-%m-%d %H:%M") if t.deadline else "",
            t.notes or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=venue_tasks.csv"}
    )


@router.get("/export/equipment")
@limiter.limit("10/minute")
@require_permission("venue:export")
async def export_equipment_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export equipment to CSV."""
    equipment = db.query(Equipment).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Category", "Total", "Available", "Booked", "Condition", "Location"])
    
    for e in equipment:
        writer.writerow([
            e.name, e.category, e.total_quantity, e.available_quantity,
            e.booked_quantity, e.condition.value, e.location or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=equipment_inventory.csv"}
    )


@router.get("/export/rooms")
@limiter.limit("10/minute")
@require_permission("venue:export")
async def export_rooms_csv(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export room allocations to CSV."""
    rooms = db.query(RoomAllocation).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Room Name", "Room Number", "Capacity", "Floor", "Allocated To", "Session Type", "Time Slot"])
    
    for r in rooms:
        writer.writerow([
            r.room_name, r.room_number or "", r.capacity, r.floor or "",
            r.allocated_to or "", r.session_type.value if r.session_type else "", r.time_slot or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=room_allocations.csv"}
    )


# ============ SEED PRE-LOADED DATA ============

@router.post("/seed")
@limiter.limit("1/minute")
@require_permission("venue:edit")
async def seed_venue_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Seed pre-loaded logistics data. Run once."""
    # Check if data already exists
    if db.query(VenueTask).count() > 0:
        return {"message": "Data already seeded", "skipped": True}
    
    # --- 24 Pre-loaded Tasks ---
    tasks_data = [
        # Venue Management (8)
        {"category": "venue", "task_name": "Coordinate venue inspection", "priority": "high",
         "description": "Walk through entire venue with team to assess readiness"},
        {"category": "venue", "task_name": "Plan hall and room allocation", "priority": "high",
         "description": "Assign sessions to appropriate halls based on capacity"},
        {"category": "venue", "task_name": "Prepare seating arrangements", "priority": "medium",
         "description": "Design seating layout for each session type"},
        {"category": "venue", "task_name": "Coordinate stage and podium arrangements", "priority": "high",
         "description": "Setup stages for keynote and presentations"},
        {"category": "venue", "task_name": "Allocate technical-session halls", "priority": "high",
         "description": "Assign paper presentation halls"},
        {"category": "venue", "task_name": "Coordinate exhibition/project-display areas", "priority": "medium",
         "description": "Setup exhibition spaces for project displays"},
        {"category": "venue", "task_name": "Arrange registration/help-desk areas", "priority": "high",
         "description": "Setup registration counters and info desks"},
        {"category": "venue", "task_name": "Coordinate guest waiting areas", "priority": "medium",
         "description": "Prepare VIP/guest lounges"},
        
        # Infrastructure & Equipment (8)
        {"category": "infrastructure", "task_name": "Coordinate projectors and display systems", "priority": "high",
         "description": "Test all projectors in every hall"},
        {"category": "infrastructure", "task_name": "Coordinate LED/display screens", "priority": "medium",
         "description": "Setup LED screens for announcements"},
        {"category": "infrastructure", "task_name": "Coordinate microphones and sound systems", "priority": "high",
         "description": "Test all mics and speakers"},
        {"category": "infrastructure", "task_name": "Coordinate tables and chairs", "priority": "medium",
         "description": "Arrange furniture as per seating plan"},
        {"category": "infrastructure", "task_name": "Coordinate electrical requirements and backup", "priority": "high",
         "description": "Verify power supply and backup generators"},
        {"category": "infrastructure", "task_name": "Coordinate internet/Wi-Fi requirements", "priority": "high",
         "description": "Test Wi-Fi capacity for expected load"},
        {"category": "infrastructure", "task_name": "Arrange signage and directional boards", "priority": "medium",
         "description": "Install signs at all entry points and corridors"},
        {"category": "infrastructure", "task_name": "Coordinate banners and venue branding", "priority": "low",
         "description": "Setup conference banners and branding"},
        
        # Event-Day Logistics (8)
        {"category": "event_day", "task_name": "Ensure venue readiness before sessions", "priority": "high",
         "description": "Final check 1 hour before first session"},
        {"category": "event_day", "task_name": "Coordinate movement of equipment and materials", "priority": "medium",
         "description": "Manage equipment transfer between sessions"},
        {"category": "event_day", "task_name": "Monitor setup and dismantling", "priority": "high",
         "description": "Oversee setup in morning and dismantling after event"},
        {"category": "event_day", "task_name": "Coordinate with Host School support staff", "priority": "high",
         "description": "Liaise with venue staff throughout event"},
        {"category": "event_day", "task_name": "Monitor event-day infrastructure", "priority": "high",
         "description": "Continuous monitoring of all systems"},
        {"category": "event_day", "task_name": "Resolve venue-related issues", "priority": "high",
         "description": "Handle any issues that arise during event"},
        {"category": "event_day", "task_name": "Maintain inventory of conference materials", "priority": "medium",
         "description": "Track badges, kits, and other materials"},
        {"category": "event_day", "task_name": "Coordinate return of hired/borrowed equipment", "priority": "medium",
         "description": "Return all rented equipment post-event"},
    ]
    
    for task_data in tasks_data:
        task = VenueTask(**task_data)
        db.add(task)
    
    # --- 20 Pre-loaded Equipment ---
    equipment_data = [
        {"name": "Projector - Epson", "category": "AV", "total_quantity": 10, "available_quantity": 10, "location": "AV Store"},
        {"name": "LED Screen - 65 inch", "category": "AV", "total_quantity": 5, "available_quantity": 5, "location": "AV Store"},
        {"name": "Wireless Microphone", "category": "Audio", "total_quantity": 20, "available_quantity": 20, "location": "AV Store"},
        {"name": "Lapel Microphone", "category": "Audio", "total_quantity": 10, "available_quantity": 10, "location": "AV Store"},
        {"name": "Podium Microphone", "category": "Audio", "total_quantity": 5, "available_quantity": 5, "location": "AV Store"},
        {"name": "Table - Round", "category": "Furniture", "total_quantity": 50, "available_quantity": 50, "location": "Storage"},
        {"name": "Table - Rectangular", "category": "Furniture", "total_quantity": 30, "available_quantity": 30, "location": "Storage"},
        {"name": "Chair - Standard", "category": "Furniture", "total_quantity": 500, "available_quantity": 500, "location": "Storage"},
        {"name": "Chair - VIP", "category": "Furniture", "total_quantity": 50, "available_quantity": 50, "location": "Storage"},
        {"name": "Extension Board", "category": "Electrical", "total_quantity": 30, "available_quantity": 30, "location": "Storage"},
        {"name": "Power Backup Unit", "category": "Electrical", "total_quantity": 5, "available_quantity": 5, "location": "Generator Room"},
        {"name": "Wi-Fi Router", "category": "IT", "total_quantity": 10, "available_quantity": 10, "location": "Server Room"},
        {"name": "Directional Signage", "category": "Signage", "total_quantity": 40, "available_quantity": 40, "location": "Storage"},
        {"name": "Standee Banner", "category": "Branding", "total_quantity": 20, "available_quantity": 20, "location": "Storage"},
        {"name": "Flex Banner", "category": "Branding", "total_quantity": 15, "available_quantity": 15, "location": "Storage"},
        {"name": "Laptop - Presenter", "category": "IT", "total_quantity": 10, "available_quantity": 10, "location": "AV Store"},
        {"name": "Clicker/Presenter", "category": "AV", "total_quantity": 10, "available_quantity": 10, "location": "AV Store"},
        {"name": "Whiteboard", "category": "Furniture", "total_quantity": 8, "available_quantity": 8, "location": "Storage"},
        {"name": "Flip Chart", "category": "Furniture", "total_quantity": 10, "available_quantity": 10, "location": "Storage"},
        {"name": "Name Badge Holder", "category": "Materials", "total_quantity": 100, "available_quantity": 100, "location": "Registration"},
    ]
    
    for eq_data in equipment_data:
        equipment = Equipment(**eq_data)
        db.add(equipment)
    
    # --- 14 Pre-loaded Rooms ---
    rooms_data = [
        {"room_name": "Main Auditorium", "room_number": "A-001", "capacity": 500, "floor": "Ground", "grid_position": {"row": 1, "col": 1}},
        {"room_name": "Hall A", "room_number": "H-A", "capacity": 200, "floor": "First", "grid_position": {"row": 2, "col": 1}},
        {"room_name": "Hall B", "room_number": "H-B", "capacity": 200, "floor": "First", "grid_position": {"row": 2, "col": 2}},
        {"room_name": "Hall C", "room_number": "H-C", "capacity": 150, "floor": "First", "grid_position": {"row": 2, "col": 3}},
        {"room_name": "Seminar Room 1", "room_number": "S-101", "capacity": 50, "floor": "Second", "grid_position": {"row": 3, "col": 1}},
        {"room_name": "Seminar Room 2", "room_number": "S-102", "capacity": 50, "floor": "Second", "grid_position": {"row": 3, "col": 2}},
        {"room_name": "Seminar Room 3", "room_number": "S-103", "capacity": 50, "floor": "Second", "grid_position": {"row": 3, "col": 3}},
        {"room_name": "Workshop Room 1", "room_number": "W-201", "capacity": 40, "floor": "Second", "grid_position": {"row": 4, "col": 1}},
        {"room_name": "Workshop Room 2", "room_number": "W-202", "capacity": 40, "floor": "Second", "grid_position": {"row": 4, "col": 2}},
        {"room_name": "Exhibition Area", "room_number": "E-001", "capacity": 300, "floor": "Ground", "grid_position": {"row": 1, "col": 2}},
        {"room_name": "Registration Hall", "room_number": "R-001", "capacity": 100, "floor": "Ground", "grid_position": {"row": 1, "col": 3}},
        {"room_name": "VIP Lounge", "room_number": "V-101", "capacity": 30, "floor": "First", "grid_position": {"row": 2, "col": 4}},
        {"room_name": "Media Room", "room_number": "M-201", "capacity": 20, "floor": "Second", "grid_position": {"row": 4, "col": 3}},
        {"room_name": "Green Room", "room_number": "G-101", "capacity": 15, "floor": "First", "grid_position": {"row": 2, "col": 5}},
    ]
    
    for room_data in rooms_data:
        room = RoomAllocation(**room_data)
        db.add(room)
    
    # --- Pre-loaded Checklists ---
    checklists_data = [
        # Pre-Event Checklist
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "All rooms cleaned and ready"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Projectors tested in all halls"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Microphones checked and batteries replaced"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Signage installed at all entry points"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Registration desk setup complete"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Wi-Fi tested with expected load"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Backup power (generators) tested"},
        {"template_name": "Pre-Event (Day Before)", "category": "pre_event", "item": "Emergency exits clearly marked"},
        
        # Event-Day Morning Checklist
        {"template_name": "Event-Day Morning", "category": "event_day_morning", "item": "Venue unlocked and lights on"},
        {"template_name": "Event-Day Morning", "category": "event_day_morning", "item": "AC/ventilation running"},
        {"template_name": "Event-Day Morning", "category": "event_day_morning", "item": "Registration materials stocked"},
        {"template_name": "Event-Day Morning", "category": "event_day_morning", "item": "Welcome banners in place"},
        {"template_name": "Event-Day Morning", "category": "event_day_morning", "item": "Volunteers briefed and in position"},
        {"template_name": "Event-Day Morning", "category": "event_day_morning", "item": "Technical support team on standby"},
        
        # Post-Event Checklist
        {"template_name": "Post-Event", "category": "post_event", "item": "All equipment returned"},
        {"template_name": "Post-Event", "category": "post_event", "item": "Venue cleaned"},
        {"template_name": "Post-Event", "category": "post_event", "item": "Lost & found items logged"},
        {"template_name": "Post-Event", "category": "post_event", "item": "Final inventory check"},
        {"template_name": "Post-Event", "category": "post_event", "item": "Damage report filed (if any)"},
    ]
    
    for cl_data in checklists_data:
        item = VenueChecklist(**cl_data)
        db.add(item)
    
    db.commit()
    
    log_action(db, current_user, "venue_data_seeded", "system", None,
               {"tasks": 24, "equipment": 20, "rooms": 14, "checklist_items": 19},
               request.client.host if request.client else None)
    
    return {
        "message": "Venue data seeded successfully",
        "counts": {
            "tasks": 24,
            "equipment": 20,
            "rooms": 14,
            "checklist_items": 19
        }
    }
