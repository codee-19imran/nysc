"""
Stores uploaded paper files OUTSIDE the /static folder on purpose —
papers must go through an authenticated, role-checked download endpoint
(see routers/paper.py) rather than being reachable by a guessable public
URL. This matters both for double-blind review and for keeping
unpublished research private.

NOTE on storage layout
----------------------
All paper files are stored in  <backend-root>/static/papers/
The Paper.file_url column stores the path RELATIVE TO the backend root,
e.g.  "static/papers/<uuid>.pdf"

get_paper_file_path() resolves that relative path against the backend root
(two levels up from this file: app/services/ → app/ → backend-root/).
"""
import os
import uuid

from fastapi import UploadFile

# Backend root: two directories above this file (app/services/file_service.py)
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# Where new uploads go (same folder as all existing files)
UPLOAD_DIR = os.path.join(BACKEND_ROOT, "static", "papers")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def save_paper_file(file: UploadFile) -> str:
    """Saves the upload and returns a relative path stored on the Paper row."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type '{ext}' not allowed. Use PDF or Word documents.")

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File exceeds the 20 MB size limit.")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Return relative path from backend root — consistent with how paper.py stores it
    return f"static/papers/{filename}"


def get_paper_file_path(stored_file_url: str) -> str:
    """
    Resolve the absolute path for a stored file_url.

    stored_file_url may be:
      - A relative path from the backend root, e.g.  "static/papers/<uuid>.pdf"
      - A bare filename,                             e.g.  "<uuid>.pdf"

    Either form is resolved against BACKEND_ROOT so the result is always absolute.
    """
    # If it's already an absolute path, return as-is
    if os.path.isabs(stored_file_url):
        return stored_file_url

    # If it looks like a relative path with directory separators, resolve from root
    if "/" in stored_file_url or "\\" in stored_file_url:
        # Normalise forward-slashes (Windows-safe)
        relative = stored_file_url.replace("\\", "/")
        return os.path.join(BACKEND_ROOT, *relative.split("/"))

    # Bare filename — assume it lives in UPLOAD_DIR
    return os.path.join(UPLOAD_DIR, stored_file_url)
