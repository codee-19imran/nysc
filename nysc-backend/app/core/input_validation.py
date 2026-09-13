"""
Input validation and sanitization utilities.
"""
import re
from typing import Optional
import html


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input - strip HTML, limit length."""
    if not value:
        return ""
    
    # Strip HTML tags
    clean = re.sub(r'<[^>]+>', '', value)
    
    # Unescape HTML entities
    clean = html.unescape(clean)
    
    # Limit length
    return clean[:max_length].strip()


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Validate phone number format (flexible)."""
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    return 7 <= len(digits) <= 15


def validate_file_type(file_content: bytes, allowed_types: list) -> bool:
    """Validate file type by checking magic bytes."""
    if not file_content:
        return False
    
    # PDF magic bytes
    if "application/pdf" in allowed_types:
        if file_content[:4] == b'%PDF':
            return True
    
    # JPEG magic bytes
    if "image/jpeg" in allowed_types:
        if file_content[:3] == b'\xff\xd8\xff':
            return True
    
    # PNG magic bytes
    if "image/png" in allowed_types:
        if file_content[:8] == b'\x89PNG\r\n\x1a\n':
            return True
    
    return False
