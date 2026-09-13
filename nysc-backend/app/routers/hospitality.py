from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
import uuid
import csv
import io
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.registration import Registration, PaymentStatus
from app.models.venue import RoomAllocation, VenueTask, TaskCategory, TaskStatus
from app.models.hospitality import (
    HospitalityGuest, HospitalityMeal, HospitalityCeremony,
    HelpDeskRequest, MaterialType, ParticipantMaterialCollection,
    ParticipantAssistance,
    GuestCategory, GuestStatus, HospitalityMealType, MealStatus,
    CeremonyStatus, HelpDeskCategory, HelpDeskPriority, HelpDeskStatus,
    MaterialStatus
)
from app.schemas.hospitality import (
    HospitalityGuestCreate, HospitalityGuestUpdate, HospitalityGuestResponse,
    HospitalityMealCreate, HospitalityMealUpdate, HospitalityMealResponse,
    HospitalityCeremonyCreate, HospitalityCeremonyUpdate, HospitalityCeremonyResponse,
    HelpDeskRequestCreate, HelpDeskRequestUpdate, HelpDeskRequestResponse,
    MaterialTypeCreate, MaterialTypeUpdate, MaterialTypeResponse,
    ParticipantAssistanceCreate, ParticipantAssistanceUpdate, ParticipantAssistanceResponse,
    HospitalityStatsResponse
)
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/hospitality", tags=["hospitality"])


# ============ STATS ============

@router.get("/stats", response_model=HospitalityStatsResponse)
@limiter.limit("100/minute")
@require_permission("hospitality:view")
async def get_hospitality_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hospitality dashboard statistics."""
    # Participants by category
    total_participants = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid
    ).count()
    
    students_count = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid,
        Registration.category == 'student'
    ).count()
    
    professionals_count = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid,
        Registration.category == 'professional'
    ).count()
    
    accompanying_count = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid,
        Registration.category == 'accompanying'
    ).count()
    
    # Students assisted
    students_assisted = db.query(ParticipantAssistance).filter(
        ParticipantAssistance.assisted_at_registration == True
    ).count()
    
    # Guests
    guests_confirmed = db.query(HospitalityGuest).filter(
        HospitalityGuest.status.in_([GuestStatus.confirmed, GuestStatus.arrived])
    ).count()
    
    # Volunteers with active tasks
    volunteers_active = db.query(User).filter(
        User.role == UserRole.volunteer,
        User.is_active == 1
    ).count()
    
    # Meals
    meals_planned = db.query(HospitalityMeal).filter(
        HospitalityMeal.status.in_([MealStatus.planned, MealStatus.confirmed])
    ).count()
    
    # Help desk
    helpdesk_open = db.query(HelpDeskRequest).filter(
        HelpDeskRequest.status.in_([HelpDeskStatus.open, HelpDeskStatus.in_progress])
    ).count()
    
    helpdesk_resolved = db.query(HelpDeskRequest).filter(
        HelpDeskRequest.status.in_([HelpDeskStatus.resolved, HelpDeskStatus.closed])
    ).count()
    
    # Materials
    materials_ready = db.query(MaterialType).filter(
        MaterialType.status == MaterialStatus.ready
    ).count()
    
    return HospitalityStatsResponse(
        total_participants=total_participants,
        students_count=students_count,
        professionals_count=professionals_count,
        accompanying_count=accompanying_count,
        students_assisted=students_assisted,
        guests_confirmed=guests_confirmed,
        volunteers_active=volunteers_active,
        meals_planned=meals_planned,
        helpdesk_open=helpdesk_open,
        helpdesk_resolved=helpdesk_resolved,
        materials_ready=materials_ready
    )


# ============ ALL PARTICIPANTS ============

@router.get("/participants")
@limiter.limit("100/minute")
@require_permission("hospitality:participants")
async def get_participants(
    request: Request,
    category: Optional[str] = None,
    assisted_filter: Optional[str] = None,  # 'assisted', 'not_assisted', 'all'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all registered participants with assistance status."""
    query = db.query(Registration).filter(Registration.payment_status == PaymentStatus.paid)
    
    if category and category != 'all':
        query = query.filter(Registration.category == category)
    
    registrations = query.all()
    
    result = []
    for reg in registrations:
        user = db.query(User).filter(User.id == reg.user_id).first()
        if not user:
            continue
        
        # Get assistance record
        assistance = db.query(ParticipantAssistance).filter(
            ParticipantAssistance.registration_id == reg.id
        ).first()
        
        # Get materials collected
        materials_collected = db.query(ParticipantMaterialCollection).filter(
            ParticipantMaterialCollection.registration_id == reg.id
        ).count()
        
        # Apply assistance filter
        is_assisted = assistance and assistance.assisted_at_registration
        if assisted_filter == 'assisted' and not is_assisted:
            continue
        if assisted_filter == 'not_assisted' and is_assisted:
            continue
        
        result.append({
            "registration_id": str(reg.id),
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "category": reg.category,
            "participation_type": reg.participation_type if hasattr(reg, 'participation_type') else None,
            "assisted_at_registration": is_assisted,
            "assisted_at": assistance.assisted_at.isoformat() if assistance and assistance.assisted_at else None,
            "needs_guidance": assistance.needs_guidance if assistance else False,
            "movement_group": assistance.movement_group if assistance else None,
            "assistance_notes": assistance.notes if assistance else None,
            "materials_collected_count": materials_collected,
            "reg_code": reg.reg_code if hasattr(reg, 'reg_code') else None
        })
    
    return result


@router.post("/participants/{registration_id}/assistance")
@limiter.limit("60/minute")
@require_permission("hospitality:participants")
async def update_participant_assistance(
    registration_id: uuid.UUID,
    payload: ParticipantAssistanceUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update assistance status for a participant."""
    reg = db.query(Registration).filter(Registration.id == registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    assistance = db.query(ParticipantAssistance).filter(
        ParticipantAssistance.registration_id == registration_id
    ).first()
    
    if not assistance:
        assistance = ParticipantAssistance(
            registration_id=registration_id,
            assisted_at_registration=payload.assisted_at_registration or False,
            needs_guidance=payload.needs_guidance or False,
            movement_group=payload.movement_group,
            notes=payload.notes
        )
        if payload.assisted_at_registration:
            assistance.assisted_at = datetime.utcnow()
            assistance.assisted_by = current_user.id
        db.add(assistance)
    else:
        for key, value in payload.dict(exclude_unset=True).items():
            setattr(assistance, key, value)
        
        if payload.assisted_at_registration and not assistance.assisted_at:
            assistance.assisted_at = datetime.utcnow()
            assistance.assisted_by = current_user.id
    
    db.commit()
    
    user = db.query(User).filter(User.id == reg.user_id).first()
    log_action(
        db, current_user, "participant_assistance_updated", "registration", registration_id,
        {"participant_name": user.name if user else "Unknown", "changes": list(payload.dict(exclude_unset=True).keys())},
        request.client.host if request.client else None
    )
    
    return {"message": "Assistance updated"}


# ============ GUESTS ============

@router.get("/guests", response_model=List[HospitalityGuestResponse])
@limiter.limit("100/minute")
@require_permission("hospitality:guests")
async def get_guests(
    request: Request,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all guests/VIPs."""
    query = db.query(HospitalityGuest)
    if category:
        query = query.filter(HospitalityGuest.category == category)
    return query.order_by(HospitalityGuest.name).all()


@router.post("/guests", response_model=HospitalityGuestResponse)
@limiter.limit("30/minute")
@require_permission("hospitality:guests")
async def create_guest(
    payload: HospitalityGuestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new guest."""
    guest = HospitalityGuest(**payload.dict())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    
    log_action(db, current_user, "guest_created", "guest", guest.id,
               {"name": guest.name, "category": guest.category.value},
               request.client.host if request.client else None)
    
    return guest


@router.put("/guests/{guest_id}", response_model=HospitalityGuestResponse)
@limiter.limit("60/minute")
@require_permission("hospitality:guests")
async def update_guest(
    guest_id: uuid.UUID,
    payload: HospitalityGuestUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a guest."""
    guest = db.query(HospitalityGuest).filter(HospitalityGuest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(guest, key, value)
    
    db.commit()
    db.refresh(guest)
    return guest


@router.delete("/guests/{guest_id}")
@limiter.limit("30/minute")
@require_permission("hospitality:guests")
async def delete_guest(
    guest_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a guest."""
    guest = db.query(HospitalityGuest).filter(HospitalityGuest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    db.delete(guest)
    db.commit()
    return {"message": "Guest deleted"}


# ============ MEALS ============

@router.get("/meals", response_model=List[HospitalityMealResponse])
@limiter.limit("100/minute")
@require_permission("hospitality:edit")
async def get_meals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all planned meals."""
    meals = db.query(HospitalityMeal).order_by(HospitalityMeal.date.asc().nullslast()).all()
    
    result = []
    for m in meals:
        room_name = None
        if m.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == m.room_id).first()
            room_name = room.room_name if room else None
        
        result.append(HospitalityMealResponse(
            id=m.id, meal_type=m.meal_type.value, name=m.name,
            date=m.date, time_slot=m.time_slot, expected_count=m.expected_count,
            menu_items=m.menu_items, room_id=m.room_id, room_name=room_name,
            venue_name=m.venue_name, veg_count=m.veg_count, non_veg_count=m.non_veg_count,
            jain_count=m.jain_count, gluten_free_count=m.gluten_free_count,
            water_stations=m.water_stations, vendor_name=m.vendor_name,
            vendor_contact=m.vendor_contact, status=m.status.value,
            notes=m.notes, created_at=m.created_at
        ))
    
    return result


@router.post("/meals", response_model=HospitalityMealResponse)
@limiter.limit("30/minute")
@require_permission("hospitality:edit")
async def create_meal(
    payload: HospitalityMealCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new meal plan."""
    meal = HospitalityMeal(**payload.dict())
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.put("/meals/{meal_id}", response_model=HospitalityMealResponse)
@limiter.limit("60/minute")
@require_permission("hospitality:edit")
async def update_meal(
    meal_id: uuid.UUID,
    payload: HospitalityMealUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a meal plan."""
    meal = db.query(HospitalityMeal).filter(HospitalityMeal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(meal, key, value)
    
    db.commit()
    db.refresh(meal)
    return meal


@router.delete("/meals/{meal_id}")
@limiter.limit("30/minute")
@require_permission("hospitality:edit")
async def delete_meal(
    meal_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a meal plan."""
    meal = db.query(HospitalityMeal).filter(HospitalityMeal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    db.delete(meal)
    db.commit()
    return {"message": "Meal deleted"}


# ============ CEREMONIES ============

@router.get("/ceremonies", response_model=List[HospitalityCeremonyResponse])
@limiter.limit("100/minute")
@require_permission("hospitality:protocol")
async def get_ceremonies(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all ceremonies."""
    ceremonies = db.query(HospitalityCeremony).order_by(HospitalityCeremony.date.asc().nullslast()).all()
    
    result = []
    for c in ceremonies:
        room_name = None
        if c.room_id:
            room = db.query(RoomAllocation).filter(RoomAllocation.id == c.room_id).first()
            room_name = room.room_name if room else None
        
        result.append(HospitalityCeremonyResponse(
            id=c.id, name=c.name, ceremony_type=c.ceremony_type,
            date=c.date, time_slot=c.time_slot, room_id=c.room_id,
            room_name=room_name, venue_name=c.venue_name,
            dignitary_seating=c.dignitary_seating,
            stage_entry_order=c.stage_entry_order,
            stage_exit_order=c.stage_exit_order,
            mementos_list=c.mementos_list,
            protocol_checklist=c.protocol_checklist,
            status=c.status.value, notes=c.notes, created_at=c.created_at
        ))
    
    return result


@router.post("/ceremonies", response_model=HospitalityCeremonyResponse)
@limiter.limit("30/minute")
@require_permission("hospitality:protocol")
async def create_ceremony(
    payload: HospitalityCeremonyCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ceremony."""
    ceremony = HospitalityCeremony(**payload.dict())
    db.add(ceremony)
    db.commit()
    db.refresh(ceremony)
    return ceremony


@router.put("/ceremonies/{ceremony_id}", response_model=HospitalityCeremonyResponse)
@limiter.limit("60/minute")
@require_permission("hospitality:protocol")
async def update_ceremony(
    ceremony_id: uuid.UUID,
    payload: HospitalityCeremonyUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a ceremony."""
    ceremony = db.query(HospitalityCeremony).filter(HospitalityCeremony.id == ceremony_id).first()
    if not ceremony:
        raise HTTPException(status_code=404, detail="Ceremony not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(ceremony, key, value)
    
    db.commit()
    db.refresh(ceremony)
    return ceremony


@router.delete("/ceremonies/{ceremony_id}")
@limiter.limit("30/minute")
@require_permission("hospitality:protocol")
async def delete_ceremony(
    ceremony_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a ceremony."""
    ceremony = db.query(HospitalityCeremony).filter(HospitalityCeremony.id == ceremony_id).first()
    if not ceremony:
        raise HTTPException(status_code=404, detail="Ceremony not found")
    
    db.delete(ceremony)
    db.commit()
    return {"message": "Ceremony deleted"}


# ============ VOLUNTEER DEPLOYMENT (Filtered view of Logistics tasks) ============

@router.get("/volunteer-tasks")
@limiter.limit("100/minute")
@require_permission("hospitality:volunteers")
async def get_volunteer_tasks(
    request: Request,
    duty_area: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to volunteers (filtered view of Logistics tasks)."""
    # Get all volunteer user IDs
    volunteer_ids = [u.id for u in db.query(User).filter(User.role == UserRole.volunteer).all()]
    
    if not volunteer_ids:
        return []
    
    query = db.query(VenueTask).filter(VenueTask.assigned_to.in_(volunteer_ids))
    tasks = query.order_by(VenueTask.created_at.desc()).all()
    
    result = []
    for task in tasks:
        volunteer = db.query(User).filter(User.id == task.assigned_to).first()
        
        # Filter by duty area (stored in notes as "Duty area: xxx")
        if duty_area and duty_area != 'all':
            if not task.notes or duty_area.lower() not in task.notes.lower():
                continue
        
        result.append({
            "id": str(task.id),
            "task_name": task.task_name,
            "description": task.description,
            "category": task.category.value,
            "priority": task.priority.value,
            "status": task.status.value,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "notes": task.notes,
            "volunteer_id": str(task.assigned_to),
            "volunteer_name": volunteer.name if volunteer else "Unknown",
            "volunteer_phone": volunteer.phone if volunteer else None
        })
    
    return result


@router.post("/volunteer-tasks")
@limiter.limit("60/minute")
@require_permission("hospitality:volunteers")
async def create_volunteer_task(
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a task for a volunteer (creates a Logistics task)."""
    volunteer_id = payload.get('volunteer_id')
    volunteer = db.query(User).filter(User.id == volunteer_id, User.role == UserRole.volunteer).first()
    if not volunteer:
        raise HTTPException(status_code=400, detail="Invalid volunteer")
    
    task = VenueTask(
        task_name=payload.get('task_name', 'Volunteer Duty'),
        description=payload.get('description', ''),
        category=TaskCategory.event_day,
        priority=payload.get('priority', 'medium'),
        assigned_to=volunteer_id,
        notes=payload.get('notes', ''),
        status=TaskStatus.not_started
    )
    db.add(task)
    db.commit()
    
    log_action(
        db, current_user, "volunteer_task_created", "task", task.id,
        {"volunteer": volunteer.name, "task_name": task.task_name},
        request.client.host if request.client else None
    )
    
    return {"message": "Task assigned", "task_id": str(task.id)}


@router.get("/volunteers-list")
@limiter.limit("100/minute")
@require_permission("hospitality:volunteers")
async def get_volunteers_list(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of volunteers for assignment dropdown."""
    volunteers = db.query(User).filter(
        User.role == UserRole.volunteer,
        User.is_active == 1
    ).all()
    
    result = []
    for v in volunteers:
        task_count = db.query(VenueTask).filter(
            VenueTask.assigned_to == v.id,
            VenueTask.status != TaskStatus.completed
        ).count()
        
        result.append({
            "id": str(v.id),
            "name": v.name,
            "email": v.email,
            "phone": v.phone,
            "active_tasks": task_count
        })
    
    return result


# ============ HELP DESK ============

@router.get("/helpdesk", response_model=List[HelpDeskRequestResponse])
@limiter.limit("100/minute")
@require_permission("hospitality:helpdesk")
async def get_helpdesk_requests(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get help desk requests."""
    query = db.query(HelpDeskRequest)
    if status_filter and status_filter != 'all':
        query = query.filter(HelpDeskRequest.status == status_filter)
    
    requests_list = query.order_by(desc(HelpDeskRequest.created_at)).all()
    
    result = []
    for r in requests_list:
        assigned_user = None
        if r.assigned_to:
            assigned_user = db.query(User).filter(User.id == r.assigned_to).first()
        
        result.append(HelpDeskRequestResponse(
            id=r.id, requester_name=r.requester_name,
            requester_email=r.requester_email, requester_phone=r.requester_phone,
            participant_category=r.participant_category,
            category=r.category.value, priority=r.priority.value,
            description=r.description, assigned_to=r.assigned_to,
            assigned_to_name=assigned_user.name if assigned_user else None,
            status=r.status.value, resolution_notes=r.resolution_notes,
            resolved_at=r.resolved_at, created_at=r.created_at
        ))
    
    return result


@router.post("/helpdesk", response_model=HelpDeskRequestResponse)
@limiter.limit("30/minute")
@require_permission("hospitality:helpdesk")
async def create_helpdesk_request(
    payload: HelpDeskRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new help desk request."""
    req = HelpDeskRequest(**payload.dict())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.put("/helpdesk/{request_id}", response_model=HelpDeskRequestResponse)
@limiter.limit("60/minute")
@require_permission("hospitality:helpdesk")
async def update_helpdesk_request(
    request_id: uuid.UUID,
    payload: HelpDeskRequestUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a help desk request."""
    req = db.query(HelpDeskRequest).filter(HelpDeskRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(req, key, value)
    
    # Auto-set resolved_at when status changes to resolved/closed
    if payload.status in ['resolved', 'closed'] and not req.resolved_at:
        req.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(req)
    return req


@router.delete("/helpdesk/{request_id}")
@limiter.limit("30/minute")
@require_permission("hospitality:helpdesk")
async def delete_helpdesk_request(
    request_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a help desk request."""
    req = db.query(HelpDeskRequest).filter(HelpDeskRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db.delete(req)
    db.commit()
    return {"message": "Request deleted"}


# ============ MATERIALS ============

@router.get("/materials", response_model=List[MaterialTypeResponse])
@limiter.limit("100/minute")
@require_permission("hospitality:materials")
async def get_materials(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all material types."""
    materials = db.query(MaterialType).order_by(MaterialType.name).all()
    
    result = []
    for m in materials:
        result.append(MaterialTypeResponse(
            id=m.id, name=m.name, description=m.description,
            total_quantity=m.total_quantity, distributed_count=m.distributed_count,
            remaining_count=m.total_quantity - m.distributed_count,
            distribution_venue=m.distribution_venue, status=m.status.value,
            notes=m.notes, created_at=m.created_at
        ))
    
    return result


@router.post("/materials", response_model=MaterialTypeResponse)
@limiter.limit("30/minute")
@require_permission("hospitality:materials")
async def create_material(
    payload: MaterialTypeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new material type."""
    material = MaterialType(**payload.dict())
    db.add(material)
    db.commit()
    db.refresh(material)
    return MaterialTypeResponse(
        id=material.id, name=material.name, description=material.description,
        total_quantity=material.total_quantity, distributed_count=material.distributed_count,
        remaining_count=material.total_quantity - material.distributed_count,
        distribution_venue=material.distribution_venue, status=material.status.value,
        notes=material.notes, created_at=material.created_at
    )


@router.put("/materials/{material_id}", response_model=MaterialTypeResponse)
@limiter.limit("60/minute")
@require_permission("hospitality:materials")
async def update_material(
    material_id: uuid.UUID,
    payload: MaterialTypeUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a material type."""
    material = db.query(MaterialType).filter(MaterialType.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(material, key, value)
    
    db.commit()
    db.refresh(material)
    return MaterialTypeResponse(
        id=material.id, name=material.name, description=material.description,
        total_quantity=material.total_quantity, distributed_count=material.distributed_count,
        remaining_count=material.total_quantity - material.distributed_count,
        distribution_venue=material.distribution_venue, status=material.status.value,
        notes=material.notes, created_at=material.created_at
    )


@router.post("/materials/{material_id}/collect")
@limiter.limit("120/minute")
@require_permission("hospitality:materials")
async def collect_material(
    material_id: uuid.UUID,
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a material as collected by a participant."""
    registration_id = payload.get('registration_id')
    if not registration_id:
        raise HTTPException(status_code=400, detail="registration_id required")
    
    material = db.query(MaterialType).filter(MaterialType.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Check if already collected
    existing = db.query(ParticipantMaterialCollection).filter(
        ParticipantMaterialCollection.registration_id == registration_id,
        ParticipantMaterialCollection.material_type_id == material_id
    ).first()
    
    if existing:
        return {"message": "Already collected", "already": True}
    
    collection = ParticipantMaterialCollection(
        registration_id=registration_id,
        material_type_id=material_id,
        collected_by=current_user.id
    )
    db.add(collection)
    
    material.distributed_count += 1
    db.commit()
    
    return {"message": "Material collected", "already": False}


@router.delete("/materials/{material_id}")
@limiter.limit("30/minute")
@require_permission("hospitality:materials")
async def delete_material(
    material_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a material type."""
    material = db.query(MaterialType).filter(MaterialType.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}


# ============ EXPORTS ============

@router.get("/export/participants")
@limiter.limit("10/minute")
@require_permission("hospitality:export")
async def export_participants(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all participants with assistance status."""
    registrations = db.query(Registration).filter(
        Registration.payment_status == PaymentStatus.paid
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Category", "Assisted", "Needs Guidance", "Movement Group", "Materials Collected"])
    
    for reg in registrations:
        user = db.query(User).filter(User.id == reg.user_id).first()
        if not user:
            continue
        
        assistance = db.query(ParticipantAssistance).filter(
            ParticipantAssistance.registration_id == reg.id
        ).first()
        
        materials_count = db.query(ParticipantMaterialCollection).filter(
            ParticipantMaterialCollection.registration_id == reg.id
        ).count()
        
        writer.writerow([
            user.name, user.email, user.phone, reg.category,
            "Yes" if assistance and assistance.assisted_at_registration else "No",
            "Yes" if assistance and assistance.needs_guidance else "No",
            assistance.movement_group if assistance else "",
            materials_count
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=participants.csv"}
    )


@router.get("/export/guests")
@limiter.limit("10/minute")
@require_permission("hospitality:export")
async def export_guests(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export guests with special requirements."""
    guests = db.query(HospitalityGuest).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Designation", "Organization", "Category", "Email", "Phone",
                     "Arrival", "Departure", "Accommodation", "Pickup", "Drop",
                     "Dietary", "Mobility", "Protocol Officer", "Status"])
    
    for g in guests:
        writer.writerow([
            g.name, g.designation or "", g.organization or "", g.category.value,
            g.email or "", g.phone or "",
            g.arrival_datetime.strftime("%Y-%m-%d %H:%M") if g.arrival_datetime else "",
            g.departure_datetime.strftime("%Y-%m-%d %H:%M") if g.departure_datetime else "",
            g.accommodation_details or "",
            "Yes" if g.pickup_required else "No",
            "Yes" if g.drop_required else "No",
            g.dietary_requirements or "",
            g.mobility_requirements or "",
            g.protocol_officer or "",
            g.status.value
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=guests.csv"}
    )


@router.get("/export/volunteer-tasks")
@limiter.limit("10/minute")
@require_permission("hospitality:export")
async def export_volunteer_tasks(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export volunteer tasks."""
    volunteer_ids = [u.id for u in db.query(User).filter(User.role == UserRole.volunteer).all()]
    if not volunteer_ids:
        return StreamingResponse(iter([""]), media_type="text/csv")
    
    tasks = db.query(VenueTask).filter(VenueTask.assigned_to.in_(volunteer_ids)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Task", "Volunteer", "Category", "Priority", "Status", "Deadline", "Notes"])
    
    for t in tasks:
        volunteer = db.query(User).filter(User.id == t.assigned_to).first()
        writer.writerow([
            t.task_name, volunteer.name if volunteer else "",
            t.category.value, t.priority.value, t.status.value,
            t.deadline.strftime("%Y-%m-%d %H:%M") if t.deadline else "",
            t.notes or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=volunteer_tasks.csv"}
    )


@router.get("/export/helpdesk")
@limiter.limit("10/minute")
@require_permission("hospitality:export")
async def export_helpdesk(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export help desk requests."""
    requests_list = db.query(HelpDeskRequest).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Requester", "Email", "Category", "Priority", "Description", "Assigned To", "Status", "Created At", "Resolved At"])
    
    for r in requests_list:
        assigned = db.query(User).filter(User.id == r.assigned_to).first() if r.assigned_to else None
        writer.writerow([
            r.requester_name, r.requester_email or "",
            r.category.value, r.priority.value, r.description,
            assigned.name if assigned else "",
            r.status.value,
            r.created_at.strftime("%Y-%m-%d %H:%M"),
            r.resolved_at.strftime("%Y-%m-%d %H:%M") if r.resolved_at else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=helpdesk.csv"}
    )


@router.get("/export/materials")
@limiter.limit("10/minute")
@require_permission("hospitality:export")
async def export_materials(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export materials distribution."""
    materials = db.query(MaterialType).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Material", "Total Qty", "Distributed", "Remaining", "Venue", "Status"])
    
    for m in materials:
        writer.writerow([
            m.name, m.total_quantity, m.distributed_count,
            m.total_quantity - m.distributed_count,
            m.distribution_venue or "", m.status.value
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=materials.csv"}
    )


@router.get("/export/meals")
@limiter.limit("10/minute")
@require_permission("hospitality:export")
async def export_meals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export meals plan."""
    meals = db.query(HospitalityMeal).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Type", "Date", "Time", "Expected Count", "Veg", "Non-Veg", "Jain", "Gluten-Free", "Venue", "Vendor", "Status"])
    
    for m in meals:
        writer.writerow([
            m.name or "", m.meal_type.value,
            m.date.strftime("%Y-%m-%d") if m.date else "",
            m.time_slot or "", m.expected_count,
            m.veg_count, m.non_veg_count, m.jain_count, m.gluten_free_count,
            m.venue_name or "", m.vendor_name or "", m.status.value
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=meals.csv"}
    )


# ============ SEED PRE-LOADED DATA ============

@router.post("/seed")
@limiter.limit("1/minute")
@require_permission("hospitality:edit")
async def seed_hospitality_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Seed pre-loaded hospitality data. Run once."""
    if db.query(HospitalityGuest).count() > 0:
        return {"message": "Data already seeded", "skipped": True}
    
    # --- 8 Guests/VIPs ---
    guests_data = [
        {"name": "Dr. A.P.J. Scientist", "designation": "Chief Guest", "organization": "ISRO",
         "category": "chief_guest", "email": "chief@nysc.edu", "phone": "9876543210",
         "arrival_datetime": datetime(2026, 12, 17, 8, 0), "departure_datetime": datetime(2026, 12, 18, 18, 0),
         "accommodation_details": "Hotel Royal, Room 501", "pickup_required": True, "drop_required": True,
         "dietary_requirements": "Vegetarian", "protocol_officer": "Rajesh Kumar"},
        {"name": "Prof. Marie Researcher", "designation": "Keynote Speaker", "organization": "MIT",
         "category": "speaker", "email": "marie@mit.edu", "phone": "9876543211",
         "arrival_datetime": datetime(2026, 12, 16, 14, 0), "departure_datetime": datetime(2026, 12, 18, 12, 0),
         "accommodation_details": "Hotel Royal, Room 502", "pickup_required": True,
         "dietary_requirements": "Vegan", "protocol_officer": "Priya Sharma"},
        {"name": "Mr. Vikram Industry", "designation": "CEO", "organization": "GreenTech Solutions",
         "category": "sponsor", "email": "vikram@greentech.com", "phone": "9876543212",
         "accommodation_details": "Self-arranged", "protocol_officer": "Amit Patel"},
        {"name": "Ms. Sarah Journalist", "designation": "Science Correspondent", "organization": "The Hindu",
         "category": "media", "email": "sarah@thehindu.com", "phone": "9876543213",
         "protocol_officer": "Media Team"},
        {"name": "Dr. Rajesh Academic", "designation": "Professor", "organization": "IISc Bangalore",
         "category": "speaker", "email": "rajesh@iisc.edu", "phone": "9876543214",
         "protocol_officer": "Priya Sharma"},
        {"name": "Ms. Anita NGO", "designation": "Director", "organization": "EcoFoundation",
         "category": "other", "email": "anita@ecofoundation.org", "phone": "9876543215",
         "dietary_requirements": "Jain", "protocol_officer": "Rajesh Kumar"},
        {"name": "Dr. Suresh Govt", "designation": "Secretary", "organization": "Ministry of Education",
         "category": "chief_guest", "email": "suresh@edu.gov.in", "phone": "9876543216",
         "arrival_datetime": datetime(2026, 12, 17, 9, 0), "pickup_required": True, "drop_required": True,
         "protocol_officer": "Protocol Team"},
        {"name": "Prof. Kavita University", "designation": "Dean", "organization": "Central University",
         "category": "other", "email": "kavita@cu.ac.in", "phone": "9876543217",
         "protocol_officer": "Host Coordination"},
    ]
    
    for g_data in guests_data:
        guest = HospitalityGuest(**g_data)
        db.add(guest)
    
    # --- 6 Meals ---
    meals_data = [
        {"meal_type": "breakfast", "name": "Day 1 Breakfast", "time_slot": "08:00-10:00",
         "expected_count": 400, "menu_items": "Idli, Vada, Pongal, Coffee, Tea",
         "veg_count": 350, "non_veg_count": 0, "jain_count": 30, "gluten_free_count": 20,
         "water_stations": 8, "vendor_name": "Hotel Catering"},
        {"meal_type": "lunch", "name": "Day 1 Lunch", "time_slot": "12:30-14:30",
         "expected_count": 450, "menu_items": "Rice, Dal, Sambar, Rasam, Curd, Vegetables, Roti",
         "veg_count": 380, "non_veg_count": 50, "jain_count": 20, "gluten_free_count": 15,
         "water_stations": 10, "vendor_name": "Hotel Catering"},
        {"meal_type": "refreshment", "name": "Day 1 Evening Tea", "time_slot": "16:00-16:30",
         "expected_count": 400, "menu_items": "Tea, Coffee, Snacks",
         "veg_count": 400, "water_stations": 6, "vendor_name": "Hotel Catering"},
        {"meal_type": "breakfast", "name": "Day 2 Breakfast", "time_slot": "08:00-10:00",
         "expected_count": 400, "menu_items": "Dosa, Upma, Poori, Coffee, Tea",
         "veg_count": 350, "non_veg_count": 0, "jain_count": 30,
         "water_stations": 8, "vendor_name": "Hotel Catering"},
        {"meal_type": "lunch", "name": "Day 2 Lunch", "time_slot": "12:30-14:30",
         "expected_count": 450, "menu_items": "Biryani, Raita, Salad, Dessert",
         "veg_count": 300, "non_veg_count": 120, "jain_count": 30,
         "water_stations": 10, "vendor_name": "Hotel Catering"},
        {"meal_type": "dinner", "name": "Day 2 Gala Dinner", "time_slot": "19:30-21:30",
         "expected_count": 500, "menu_items": "Multi-cuisine buffet with live counters",
         "veg_count": 380, "non_veg_count": 100, "jain_count": 20,
         "water_stations": 12, "vendor_name": "Premium Catering"},
    ]
    
    for m_data in meals_data:
        meal = HospitalityMeal(**m_data)
        db.add(meal)
    
    # --- 2 Ceremonies ---
    ceremonies_data = [
        {
            "name": "Inauguration Ceremony", "ceremony_type": "inauguration",
            "time_slot": "09:00-10:30", "venue_name": "Main Auditorium",
            "dignitary_seating": [
                {"name": "Dr. A.P.J. Scientist", "designation": "Chief Guest", "seat": "S1"},
                {"name": "Dr. Suresh Govt", "designation": "Secretary", "seat": "S2"},
                {"name": "Prof. Kavita University", "designation": "Host VC", "seat": "S3"}
            ],
            "stage_entry_order": [
                {"order": 1, "name": "Host VC", "role": "Welcome address"},
                {"order": 2, "name": "Secretary", "role": "Presidential address"},
                {"order": 3, "name": "Chief Guest", "role": "Keynote + Inauguration"}
            ],
            "mementos_list": [
                {"item": "Shawl + Memento", "recipient": "Chief Guest", "quantity": 1},
                {"item": "Memento", "recipient": "Secretary", "quantity": 1}
            ],
            "protocol_checklist": [
                {"item": "National anthem arranged", "completed": False},
                {"item": "Mementos ready on stage", "completed": False},
                {"item": "Seating plan printed", "completed": False},
                {"item": "Protocol officers briefed", "completed": False},
                {"item": "Photography team positioned", "completed": False}
            ],
            "status": "planned"
        },
        {
            "name": "Valedictory Ceremony", "ceremony_type": "valedictory",
            "time_slot": "18:00-19:30", "venue_name": "Main Auditorium",
            "dignitary_seating": [
                {"name": "Prof. Marie Researcher", "designation": "Chief Guest", "seat": "S1"},
                {"name": "Prof. Kavita University", "designation": "Host VC", "seat": "S2"}
            ],
            "stage_entry_order": [
                {"order": 1, "name": "Host VC", "role": "Welcome"},
                {"order": 2, "name": "Organizing Secretary", "role": "Report"},
                {"order": 3, "name": "Chief Guest", "role": "Awards + Valedictory"}
            ],
            "mementos_list": [
                {"item": "Certificate + Trophy", "recipient": "Best Paper Winners", "quantity": 3},
                {"item": "Memento", "recipient": "Chief Guest", "quantity": 1}
            ],
            "protocol_checklist": [
                {"item": "Certificates printed and sorted", "completed": False},
                {"item": "Trophies polished", "completed": False},
                {"item": "Winners list finalized", "completed": False},
                {"item": "Photography team positioned", "completed": False}
            ],
            "status": "planned"
        }
    ]
    
    for c_data in ceremonies_data:
        ceremony = HospitalityCeremony(**c_data)
        db.add(ceremony)
    
    # --- 5 Help Desk Requests ---
    helpdesk_data = [
        {"requester_name": "Rahul Student", "requester_email": "rahul@student.edu",
         "participant_category": "student", "category": "registration",
         "priority": "medium", "description": "Need help with badge printing",
         "status": "open"},
        {"requester_name": "Priya Professional", "requester_email": "priya@corp.com",
         "participant_category": "professional", "category": "accommodation",
         "priority": "high", "description": "Hotel booking confirmation not received",
         "status": "open"},
        {"requester_name": "Amit Student", "requester_email": "amit@student.edu",
         "participant_category": "student", "category": "transport",
         "priority": "low", "description": "Need info about shuttle schedule",
         "status": "in_progress"},
        {"requester_name": "Meera Delegate", "requester_email": "meera@delegate.edu",
         "participant_category": "student", "category": "meals",
         "priority": "medium", "description": "Allergic to nuts, need special meal",
         "status": "resolved", "resolution_notes": "Notified catering team"},
        {"requester_name": "Vikram Speaker", "requester_email": "vikram@speaker.edu",
         "participant_category": "professional", "category": "technical",
         "priority": "urgent", "description": "Projector not working in Hall A",
         "status": "open"},
    ]
    
    for h_data in helpdesk_data:
        req = HelpDeskRequest(**h_data)
        db.add(req)
    
    # --- 5 Material Types ---
    materials_data = [
        {"name": "Welcome Kit", "description": "Contains program booklet, pen, notepad",
         "total_quantity": 500, "distribution_venue": "Registration Desk"},
        {"name": "Name Badge", "description": "Lanyard + ID card",
         "total_quantity": 550, "distribution_venue": "Registration Desk"},
        {"name": "Program Booklet", "description": "Conference schedule and abstracts",
         "total_quantity": 500, "distribution_venue": "Registration Desk"},
        {"name": "Memento", "description": "Conference memento for all participants",
         "total_quantity": 500, "distribution_venue": "Main Hall"},
        {"name": "Certificate", "description": "Participation certificates",
         "total_quantity": 500, "distribution_venue": "Main Hall"},
    ]
    
    for m_data in materials_data:
        material = MaterialType(**m_data)
        db.add(material)
    
    db.commit()
    
    log_action(db, current_user, "hospitality_data_seeded", "system", None,
               {"guests": 8, "meals": 6, "ceremonies": 2, "helpdesk": 5, "materials": 5},
               request.client.host if request.client else None)
    
    return {
        "message": "Hospitality data seeded successfully",
        "counts": {"guests": 8, "meals": 6, "ceremonies": 2, "helpdesk": 5, "materials": 5}
    }
