import hmac
import hashlib
import json
import qrcode
import os
import uuid
from app.core.config import settings


def generate_qr_hash(user_id: str, user_type: str) -> str:
    """Generate a cryptographically secure QR hash for any user."""
    message = f"{user_id}:{user_type}"
    return hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


def generate_qr_data(user_id: str, user_type: str, qr_hash: str) -> str:
    """Generate the JSON data encoded in the QR code."""
    return json.dumps({
        "user_id": user_id,
        "user_type": user_type,
        "qr_hash": qr_hash
    })


def generate_qr_image(qr_data: str, filename: str) -> str:
    """Generate a QR code image file."""
    os.makedirs("static/qr_codes", exist_ok=True)
    filepath = f"static/qr_codes/{filename}.png"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(filepath)
    
    return filepath


def generate_user_qr(user_id: str, user_type: str) -> tuple[str, str]:
    """
    Generate QR hash and image for a user.
    File is saved as {qr_hash}.png so the frontend URL
    /static/qr_codes/{qr_hash}.png resolves directly.
    Returns: (qr_hash, file_path)
    """
    qr_hash = generate_qr_hash(user_id, user_type)
    qr_data = generate_qr_data(user_id, user_type, qr_hash)
    file_path = generate_qr_image(qr_data, qr_hash)  # filename == qr_hash
    return qr_hash, file_path


def verify_qr_signature(user_id: str, user_type: str, qr_hash: str) -> bool:
    """Verify QR code signature."""
    expected = generate_qr_hash(user_id, user_type)
    return hmac.compare_digest(expected, qr_hash)
