import uuid
from datetime import datetime

from pydantic import BaseModel


class VolunteerCreate(BaseModel):
    role: str  # registration_desk / hospitality / technical / stage
    shift: str | None = None


class VolunteerUpdate(BaseModel):
    role: str | None = None
    shift: str | None = None
    assigned_duty: str | None = None


class VolunteerOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    shift: str | None = None
    assigned_duty: str | None = None

    class Config:
        from_attributes = True


class ScanRequest(BaseModel):
    qr_hash: str


class ScanResponse(BaseModel):
    status: str
    reg_code: str
    name: str
    category: str
    participation_type: str
    scanned_at: datetime
