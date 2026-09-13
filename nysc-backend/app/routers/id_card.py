from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import os
import uuid
import zipfile
import tempfile
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.id_card import IdCardTemplate, IdCard, PrintStatus
from app.services.id_card_service import (
    generate_id_card_pdf, generate_print_batch_pdf, TEMPLATE_DIR, ID_CARD_DIR
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/id-cards", tags=["id-cards"])


# ============ STATS ============

@router.get("/stats")
@limiter.limit("100/minute")
@require_permission("page:overview")
async def get_id_card_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_generated = db.query(IdCard).filter(IdCard.is_deleted == False).count()
    pending = db.query(IdCard).filter(
        IdCard.is_deleted == False,
        IdCard.print_status == PrintStatus.pending
    ).count()
    printed = db.query(IdCard).filter(
        IdCard.is_deleted == False,
        IdCard.print_status == PrintStatus.printed
    ).count()
    collected = db.query(IdCard).filter(
        IdCard.is_deleted == False,
        IdCard.print_status == PrintStatus.collected
    ).count()
    
    total_users = db.query(User).filter(User.is_active == 1).count()
    users_with_id = db.query(User).filter(User.id_card_generated == True).count()
    
    return {
        "total_generated": total_generated,
        "pending": pending,
        "printed": printed,
        "collected": collected,
        "total_users": total_users,
        "users_with_id": users_with_id,
        "users_without_id": total_users - users_with_id
    }


# ============ ID CARDS LIST ============

@router.get("/")
@limiter.limit("100/minute")
@require_permission("page:overview")
async def list_id_cards(
    request: Request,
    status_filter: Optional[str] = None,
    role_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(IdCard).filter(IdCard.is_deleted == False)
    
    if status_filter and status_filter != 'all':
        query = query.filter(IdCard.print_status == status_filter)
    
    cards = query.order_by(desc(IdCard.generated_at)).all()
    
    result = []
    for card in cards:
        user = db.query(User).filter(User.id == card.user_id).first()
        template = db.query(IdCardTemplate).filter(IdCardTemplate.id == card.template_id).first()
        
        if role_filter and role_filter != 'all' and user and user.role.value != role_filter:
            continue
        
        result.append({
            "id": str(card.id),
            "user_id": str(card.user_id),
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "user_role": user.role.value if user else "unknown",
            "template_name": template.name if template else "Unknown",
            "pdf_path": card.pdf_path,
            "print_status": card.print_status.value,
            "generated_at": card.generated_at.isoformat()
        })
    
    return result


# ============ MANUAL GENERATION ============

@router.post("/generate/{user_id}")
@limiter.limit("30/minute")
@require_permission("page:overview")
async def manually_generate_id_card(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually generate or re-generate an ID card."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    template = db.query(IdCardTemplate).filter(
        IdCardTemplate.is_active == True,
        (IdCardTemplate.target_role == user.role.value) | 
        (IdCardTemplate.target_role == 'all')
    ).first()
    
    if not template:
        raise HTTPException(status_code=400, detail=f"No active template for role {user.role.value}")
    
    pdf_path = generate_id_card_pdf(user, template, current_user.id)
    
    # Create or update record
    existing = db.query(IdCard).filter(IdCard.user_id == user_id, IdCard.is_deleted == False).first()
    if existing:
        existing.pdf_path = pdf_path
        existing.template_id = template.id
        existing.generated_by = current_user.id
        existing.print_status = PrintStatus.pending
    else:
        new_card = IdCard(
            user_id=user.id,
            template_id=template.id,
            pdf_path=pdf_path,
            generated_by=current_user.id
        )
        db.add(new_card)
    
    user.id_card_generated = True
    db.commit()
    
    log_action(db, current_user, "id_card_generated", "user", user_id,
               {"template": template.name}, request.client.host if request.client else None)
    
    return {"message": "ID card generated", "pdf_path": pdf_path}


# ============ DOWNLOAD ============

@router.get("/{card_id}/download")
@limiter.limit("100/minute")
@require_permission("page:overview")
async def download_id_card(
    card_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a single ID card PDF."""
    card = db.query(IdCard).filter(IdCard.id == card_id, IdCard.is_deleted == False).first()
    if not card or not os.path.exists(card.pdf_path):
        raise HTTPException(status_code=404, detail="ID card not found")
    
    return FileResponse(
        card.pdf_path,
        media_type='application/pdf',
        filename=os.path.basename(card.pdf_path)
    )


@router.get("/batch-print")
@limiter.limit("10/minute")
@require_permission("page:overview")
async def batch_print_pdf(
    request: Request,
    status_filter: Optional[str] = 'pending',
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate print-ready A4 PDF with 4 cards per page."""
    query = db.query(IdCard).filter(IdCard.is_deleted == False)
    if status_filter and status_filter != 'all':
        query = query.filter(IdCard.print_status == status_filter)
    
    cards = query.all()
    if not cards:
        raise HTTPException(status_code=404, detail="No cards found for batch printing")
    
    cards_data = []
    for card in cards:
        user = db.query(User).filter(User.id == card.user_id).first()
        template = db.query(IdCardTemplate).filter(IdCardTemplate.id == card.template_id).first()
        if user and template:
            cards_data.append({'user': user, 'template': template})
    
    if not cards_data:
        raise HTTPException(status_code=400, detail="No valid cards for batch printing")
    
    batch_path = generate_print_batch_pdf(cards_data)
    
    log_action(db, current_user, "batch_print_generated", "system", None,
               {"card_count": len(cards_data)}, request.client.host if request.client else None)
    
    return FileResponse(
        batch_path,
        media_type='application/pdf',
        filename=f"id_cards_batch_{len(cards_data)}.pdf"
    )


# ============ UPDATE STATUS ============

@router.put("/{card_id}/status")
@limiter.limit("100/minute")
@require_permission("page:overview")
async def update_print_status(
    card_id: uuid.UUID,
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update print status of an ID card."""
    card = db.query(IdCard).filter(IdCard.id == card_id, IdCard.is_deleted == False).first()
    if not card:
        raise HTTPException(status_code=404, detail="ID card not found")
    
    new_status = payload.get('status')
    if new_status not in ['pending', 'printed', 'collected']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    card.print_status = PrintStatus[new_status]
    db.commit()
    
    return {"message": "Status updated", "status": new_status}


@router.put("/bulk-status")
@limiter.limit("30/minute")
@require_permission("page:overview")
async def bulk_update_status(
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update status for multiple cards."""
    card_ids = payload.get('card_ids', [])
    new_status = payload.get('status')
    
    if new_status not in ['pending', 'printed', 'collected']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    updated = 0
    for cid in card_ids:
        card = db.query(IdCard).filter(IdCard.id == cid, IdCard.is_deleted == False).first()
        if card:
            card.print_status = PrintStatus[new_status]
            updated += 1
    
    db.commit()
    return {"message": f"Updated {updated} cards", "status": new_status}


# ============ TEMPLATES ============

@router.get("/templates")
@limiter.limit("100/minute")
@require_permission("page:overview")
async def list_templates(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    templates = db.query(IdCardTemplate).order_by(IdCardTemplate.created_at.desc()).all()
    return [{
        "id": str(t.id),
        "name": t.name,
        "target_role": t.target_role,
        "template_image_path": t.template_image_path,
        "config": t.config,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat()
    } for t in templates]


from app.services.file_validation import process_uploaded_file
from app.core.security_config import SecurityConfig

@router.post("/templates")
@limiter.limit("10/minute")
@require_permission("page:overview")
async def create_template(
    request: Request,
    name: str = Form(...),
    target_role: str = Form(...),
    config_json: str = Form(...),
    template_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ID card template with uploaded image."""
    import json
    
    content = await template_image.read()
    
    # Determine MIME type
    expected_mime = template_image.content_type
    if expected_mime not in SecurityConfig.ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG/PNG allowed")
    
    # Validate
    success, error, processed_content, safe_filename = await process_uploaded_file(
        file_content=content,
        filename=template_image.filename,
        expected_mime=expected_mime,
        max_size_mb=10,
        strip_exif=False  # Keep EXIF for templates
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=error)
    
    # Save
    image_path = os.path.join(TEMPLATE_DIR, safe_filename).replace("\\", "/")
    with open(image_path, "wb") as f:
        f.write(processed_content)
    
    # Parse config
    try:
        config = json.loads(config_json)
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON config")
    
    template = IdCardTemplate(
        name=name,
        target_role=target_role,
        template_image_path=image_path,
        config=config
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    
    log_action(db, current_user, "template_created", "template", template.id,
               {"name": name, "role": target_role}, request.client.host if request.client else None)
    
    return {"id": str(template.id), "name": name, "image_path": image_path}


@router.put("/templates/{template_id}")
@limiter.limit("30/minute")
@require_permission("page:overview")
async def update_template(
    template_id: uuid.UUID,
    payload: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    template = db.query(IdCardTemplate).filter(IdCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if 'name' in payload:
        template.name = payload['name']
    if 'target_role' in payload:
        template.target_role = payload['target_role']
    if 'config' in payload:
        template.config = payload['config']
    if 'is_active' in payload:
        template.is_active = payload['is_active']
    
    db.commit()
    return {"message": "Template updated"}


@router.get("/templates/{template_id}/preview")
@limiter.limit("30/minute")
@require_permission("page:overview")
async def preview_template(
    template_id: uuid.UUID,
    request: Request,
    sample_name: str = "John Doe",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview template with sample data."""
    template = db.query(IdCardTemplate).filter(IdCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create a mock user for preview
    class MockUser:
        def __init__(self):
            self.id = uuid.uuid4()
            self.name = sample_name
            self.email = "sample@example.com"
            self.role = UserRole.delegate
            self.department = "sample"
            self.qr_hash = None
            self.photo_path = None
    
    mock_user = MockUser()
    pdf_path = generate_id_card_pdf(mock_user, template)
    
    return FileResponse(
        pdf_path,
        media_type='application/pdf',
        filename="template_preview.pdf"
    )


@router.delete("/templates/{template_id}")
@limiter.limit("10/minute")
@require_permission("page:overview")
async def delete_template(
    template_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    template = db.query(IdCardTemplate).filter(IdCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
