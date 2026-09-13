import os
import uuid
import logging
from datetime import datetime
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

logger = logging.getLogger(__name__)

ID_CARD_DIR = "static/id_cards"
TEMPLATE_DIR = "static/id_card_templates"
os.makedirs(ID_CARD_DIR, exist_ok=True)
os.makedirs(TEMPLATE_DIR, exist_ok=True)

# Standard ID card size (CR80) in points
ID_CARD_WIDTH = 85.6 * mm   # ~242 points
ID_CARD_HEIGHT = 54 * mm    # ~153 points


def generate_id_card_pdf(user, template, generated_by_id=None) -> str:
    """
    Generate a single ID card PDF for a user using the given template.
    Returns the file path of the generated PDF.
    """
    # Output filename
    safe_name = user.name.replace(' ', '_').lower()[:20]
    filename = f"id_{user.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
    filepath = os.path.join(ID_CARD_DIR, filename)
    
    # Create single-card PDF (landscape A4 with one card centered)
    page_width, page_height = landscape(A4)
    c = canvas.Canvas(filepath, pagesize=landscape(A4))
    
    # Center the card on the page
    card_x = (page_width - ID_CARD_WIDTH) / 2
    card_y = (page_height - ID_CARD_HEIGHT) / 2
    
    # Draw the template image as background
    if template.template_image_path and os.path.exists(template.template_image_path):
        try:
            img = Image.open(template.template_image_path)
            img_reader = ImageReader(img)
            c.drawImage(
                img_reader, card_x, card_y,
                width=ID_CARD_WIDTH, height=ID_CARD_HEIGHT,
                preserveAspectRatio=True, mask='auto'
            )
        except Exception as e:
            logger.warning(f"Could not load template image: {e}")
            _draw_fallback_background(c, card_x, card_y)
    else:
        _draw_fallback_background(c, card_x, card_y)
    
    # Overlay fields from config
    config = template.config or {}
    fields = config.get('fields', {})
    
    # Prepare user data
    user_data = _prepare_user_data(user)
    
    # Render each configured field
    for field_name, field_config in fields.items():
        if field_name == 'qr_code':
            _draw_qr_code(c, card_x, card_y, user, field_config)
        elif field_name == 'photo':
            _draw_photo(c, card_x, card_y, user, field_config)
        elif field_name in user_data:
            _draw_text_field(c, card_x, card_y, user_data[field_name], field_config)
    
    c.save()
    logger.info(f"ID card generated for {user.name}: {filepath}")
    return filepath


def generate_print_batch_pdf(id_cards_data, output_filename="batch_print.pdf") -> str:
    """
    Generate an A4 PDF with 4 ID cards per page (2x2 grid) with crop marks.
    id_cards_data: list of dicts with 'template', 'user' keys
    Returns path to generated PDF.
    """
    filepath = os.path.join(ID_CARD_DIR, output_filename)
    page_width, page_height = landscape(A4)
    c = canvas.Canvas(filepath, pagesize=landscape(A4))
    
    # Grid layout: 2 columns x 2 rows
    margin = 15 * mm
    gap = 10 * mm
    
    # Calculate card positions to center the grid
    total_grid_width = (2 * ID_CARD_WIDTH) + gap
    total_grid_height = (2 * ID_CARD_HEIGHT) + gap
    start_x = (page_width - total_grid_width) / 2
    start_y = (page_height - total_grid_height) / 2
    
    positions = [
        (start_x, start_y + ID_CARD_HEIGHT + gap),  # Top-left
        (start_x + ID_CARD_WIDTH + gap, start_y + ID_CARD_HEIGHT + gap),  # Top-right
        (start_x, start_y),  # Bottom-left
        (start_x + ID_CARD_WIDTH + gap, start_y),  # Bottom-right
    ]
    
    card_index = 0
    for i, card_data in enumerate(id_cards_data):
        if card_index >= 4:
            # Start new page
            c.showPage()
            card_index = 0
        
        user = card_data['user']
        template = card_data['template']
        pos_x, pos_y = positions[card_index]
        
        # Draw template background
        if template.template_image_path and os.path.exists(template.template_image_path):
            try:
                img = Image.open(template.template_image_path)
                img_reader = ImageReader(img)
                c.drawImage(
                    img_reader, pos_x, pos_y,
                    width=ID_CARD_WIDTH, height=ID_CARD_HEIGHT,
                    preserveAspectRatio=True, mask='auto'
                )
            except Exception as e:
                logger.warning(f"Template load failed: {e}")
                _draw_fallback_background(c, pos_x, pos_y)
        else:
            _draw_fallback_background(c, pos_x, pos_y)
        
        # Overlay fields
        config = template.config or {}
        fields = config.get('fields', {})
        user_data = _prepare_user_data(user)
        
        for field_name, field_config in fields.items():
            if field_name == 'qr_code':
                _draw_qr_code(c, pos_x, pos_y, user, field_config)
            elif field_name == 'photo':
                _draw_photo(c, pos_x, pos_y, user, field_config)
            elif field_name in user_data:
                _draw_text_field(c, pos_x, pos_y, user_data[field_name], field_config)
        
        # Draw crop marks at corners
        _draw_crop_marks(c, pos_x, pos_y)
        
        card_index += 1
    
    c.save()
    logger.info(f"Batch PDF generated: {filepath} with {len(id_cards_data)} cards")
    return filepath


def _prepare_user_data(user) -> dict:
    """Prepare user data dictionary for template rendering."""
    # Get registration info if available
    from app.core.database import SessionLocal
    from app.models.registration import Registration
    
    db = SessionLocal()
    try:
        reg = db.query(Registration).filter(Registration.user_id == user.id).first()
        category = reg.category if reg else ""
        reg_code = reg.reg_code if hasattr(reg, 'reg_code') and reg.reg_code else ""
        domain = reg.domain if hasattr(reg, 'domain') else ""
    except Exception:
        category = ""
        reg_code = ""
        domain = ""
    finally:
        db.close()
    
    return {
        'name': user.name,
        'role': user.role.value.replace('_', ' ').title() if user.role else "",
        'category': category.title() if category else "",
        'reg_code': reg_code,
        'domain': domain,
        'email': user.email,
        'department': (user.department or '').title() if user.department else "",
    }


def _draw_text_field(c, card_x, card_y, text, config):
    """Draw a text field at configured position."""
    x = card_x + (config.get('x', 0) * mm)
    y = card_y + (config.get('y', 0) * mm)
    font = config.get('font', 'Helvetica')
    size = config.get('size', 12)
    color = config.get('color', '#000000')
    max_width = config.get('max_width')
    
    # Parse color
    try:
        if color.startswith('#'):
            color = color.lstrip('#')
            r = int(color[0:2], 16) / 255
            g = int(color[2:4], 16) / 255
            b = int(color[4:6], 16) / 255
            c.setFillColorRGB(r, g, b)
    except:
        c.setFillColorRGB(0, 0, 0)
    
    c.setFont(font, size)
    
    # Truncate if max_width specified
    if max_width:
        while c.stringWidth(text, font, size) > max_width * mm and len(text) > 1:
            text = text[:-1]
        if len(text) < len(text):
            text += "..."
    
    c.drawString(x, y, text)


def _draw_qr_code(c, card_x, card_y, user, config):
    """Draw user's existing QR code on the card."""
    if not user.qr_hash:
        return
    
    # Find existing QR image
    qr_dir = "static/qr_codes"
    qr_files = [f for f in os.listdir(qr_dir) if f.startswith(f"user_{user.id}_") and f.endswith('.png')]
    
    if not qr_files:
        return
    
    qr_path = os.path.join(qr_dir, qr_files[0])
    
    x = card_x + (config.get('x', 0) * mm)
    y = card_y + (config.get('y', 0) * mm)
    size = config.get('size', 30) * mm
    
    try:
        img = Image.open(qr_path)
        img_reader = ImageReader(img)
        c.drawImage(img_reader, x, y, width=size, height=size, preserveAspectRatio=True, mask='auto')
    except Exception as e:
        logger.warning(f"Could not load QR code: {e}")


def _draw_photo(c, card_x, card_y, user, config):
    """Draw user photo if available."""
    if not user.photo_path or not os.path.exists(user.photo_path):
        return
    
    x = card_x + (config.get('x', 0) * mm)
    y = card_y + (config.get('y', 0) * mm)
    width = config.get('width', 25) * mm
    height = config.get('height', 25) * mm
    shape = config.get('shape', 'rectangle')
    
    try:
        if shape == 'circle':
            # Clip to circle
            c.saveState()
            path = c.beginPath()
            path.circle(x + width/2, y + height/2, min(width, height)/2)
            c.clipPath(path, stroke=0)
            img = Image.open(user.photo_path)
            img_reader = ImageReader(img)
            c.drawImage(img_reader, x, y, width=width, height=height, preserveAspectRatio=True, mask='auto')
            c.restoreState()
        else:
            img = Image.open(user.photo_path)
            img_reader = ImageReader(img)
            c.drawImage(img_reader, x, y, width=width, height=height, preserveAspectRatio=True, mask='auto')
    except Exception as e:
        logger.warning(f"Could not load user photo: {e}")


def _draw_fallback_background(c, x, y):
    """Draw a simple fallback background if template image is missing."""
    # White background with border
    c.setFillColorRGB(1, 1, 1)
    c.rect(x, y, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=1)
    c.setStrokeColorRGB(0.1, 0.1, 0.3)
    c.setLineWidth(2)
    c.rect(x, y, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=0)
    
    # Header bar
    c.setFillColorRGB(0.1, 0.1, 0.3)
    c.rect(x, y + ID_CARD_HEIGHT - 20*mm, ID_CARD_WIDTH, 20*mm, fill=1)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 5*mm, y + ID_CARD_HEIGHT - 14*mm, "NYSC-2026")


def _draw_crop_marks(c, x, y):
    """Draw crop marks at card corners for cutting."""
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.3)
    mark_len = 3 * mm
    offset = 2 * mm
    
    # Top-left
    c.line(x - offset, y + ID_CARD_HEIGHT, x - offset - mark_len, y + ID_CARD_HEIGHT)
    c.line(x, y + ID_CARD_HEIGHT + offset, x, y + ID_CARD_HEIGHT + offset + mark_len)
    
    # Top-right
    c.line(x + ID_CARD_WIDTH + offset, y + ID_CARD_HEIGHT, x + ID_CARD_WIDTH + offset + mark_len, y + ID_CARD_HEIGHT)
    c.line(x + ID_CARD_WIDTH, y + ID_CARD_HEIGHT + offset, x + ID_CARD_WIDTH, y + ID_CARD_HEIGHT + offset + mark_len)
    
    # Bottom-left
    c.line(x - offset, y, x - offset - mark_len, y)
    c.line(x, y - offset, x, y - offset - mark_len)
    
    # Bottom-right
    c.line(x + ID_CARD_WIDTH + offset, y, x + ID_CARD_WIDTH + offset + mark_len, y)
    c.line(x + ID_CARD_WIDTH, y - offset, x + ID_CARD_WIDTH, y - offset - mark_len)
