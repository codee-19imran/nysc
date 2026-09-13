"""
File validation service - validates uploads by content, not just extension.
"""
import os
import uuid
import secrets
from typing import Optional, Tuple
from PIL import Image
from PIL.ExifTags import TAGS
import io
import logging

logger = logging.getLogger(__name__)

# Magic bytes for file type detection
MAGIC_BYTES = {
    "application/pdf": [b"%PDF"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/gif": [b"GIF87a", b"GIF89a"],
}

# Dangerous extensions to never allow
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".cpl", ".dll", ".hta", ".inf",
    ".jar", ".js", ".jse", ".lnk", ".msi", ".ps1", ".reg", ".scr",
    ".vbs", ".ws", ".wsf", ".sh", ".bash", ".php", ".py", ".rb"
}


def validate_file_by_magic_bytes(content: bytes, expected_mime: str) -> bool:
    """Validate file type by checking magic bytes (content sniffing)."""
    if not content:
        return False
    
    expected_magic = MAGIC_BYTES.get(expected_mime, [])
    if not expected_magic:
        # Unknown type - reject
        logger.warning(f"Unknown MIME type requested: {expected_mime}")
        return False
    
    for magic in expected_magic:
        if content.startswith(magic):
            return True
    
    return False


def validate_extension(filename: str) -> bool:
    """Check that file extension is not blocked."""
    if not filename:
        return False
    
    ext = os.path.splitext(filename)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        logger.warning(f"Blocked dangerous extension: {ext}")
        return False
    
    return True


def generate_safe_filename(original_filename: str, user_id=None) -> str:
    """Generate a randomized filename to prevent enumeration."""
    ext = os.path.splitext(original_filename)[1].lower()
    random_part = secrets.token_urlsafe(16)
    
    if user_id:
        return f"{user_id}_{random_part}{ext}"
    return f"{random_part}{ext}"


def strip_exif_from_image(image_bytes: bytes) -> bytes:
    """
    Strip EXIF data from images for privacy.
    Removes GPS, camera info, timestamps, etc.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        
        # Get image data without EXIF
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)
        
        # Save to bytes
        output = io.BytesIO()
        if img.format == "PNG":
            clean_img.save(output, format="PNG", optimize=True)
        else:
            clean_img.save(output, format="JPEG", quality=85, optimize=True)
        
        return output.getvalue()
    except Exception as e:
        logger.warning(f"Failed to strip EXIF: {e}")
        return image_bytes  # Return original on failure


def validate_image_dimensions(image_bytes: bytes, max_width: int = 4000, 
                               max_height: int = 4000) -> Tuple[bool, str]:
    """Validate image dimensions to prevent decompression bombs."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        
        if width > max_width or height > max_height:
            return False, f"Image too large: {width}x{height} (max {max_width}x{max_height})"
        
        if width == 0 or height == 0:
            return False, "Invalid image dimensions"
        
        return True, ""
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"


def validate_pdf(content: bytes, max_pages: int = 100) -> Tuple[bool, str]:
    """Basic PDF validation."""
    if not content.startswith(b"%PDF"):
        return False, "Not a valid PDF file"
    
    # Check for PDF EOF marker
    if b"%%EOF" not in content[-1024:]:
        return False, "PDF file appears corrupted"
    
    return True, ""


async def process_uploaded_file(
    file_content: bytes,
    filename: str,
    expected_mime: str,
    max_size_mb: int = 10,
    user_id=None,
    strip_exif: bool = True
) -> Tuple[bool, str, bytes, str]:
    """
    Complete file validation and processing pipeline.
    
    Returns: (success, error_message, processed_content, safe_filename)
    """
    # 1. Check size
    max_bytes = max_size_mb * 1024 * 1024
    if len(file_content) > max_bytes:
        return False, f"File too large (max {max_size_mb}MB)", None, None
    
    if len(file_content) == 0:
        return False, "Empty file", None, None
    
    # 2. Check extension
    if not validate_extension(filename):
        return False, "File type not allowed", None, None
    
    # 3. Check magic bytes
    if not validate_file_by_magic_bytes(file_content, expected_mime):
        return False, f"File content doesn't match {expected_mime}", None, None
    
    # 4. Type-specific validation
    if expected_mime.startswith("image/"):
        valid, error = validate_image_dimensions(file_content)
        if not valid:
            return False, error, None, None
        
        # Strip EXIF for privacy
        if strip_exif:
            file_content = strip_exif_from_image(file_content)
    
    elif expected_mime == "application/pdf":
        valid, error = validate_pdf(file_content)
        if not valid:
            return False, error, None, None
    
    # 5. Generate safe filename
    safe_filename = generate_safe_filename(filename, user_id)
    
    return True, "", file_content, safe_filename
