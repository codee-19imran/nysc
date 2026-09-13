import uuid

from pydantic import BaseModel, Field

from app.models.registration import ParticipationType, PaymentStatus


class RegistrationCreate(BaseModel):
    category: str = Field(..., description="student / professional")
    participation_type: ParticipationType = ParticipationType.attendee
    sub_category: str | None = Field(None, description="presenter / attendee")
    
    # student fields
    education_level: str | None = None
    student_class: str | None = None
    field_of_study: str | None = None
    graduation_year: int | None = None
    
    # professional fields
    organization: str | None = None
    designation: str | None = None
    experience: int | None = None
    
    # common fields
    state: str | None = None
    city: str | None = None
    
    # paper fields
    paper_title: str | None = None
    co_authors: list[dict] | None = None

    accompanying_count: int = 0


class RegistrationOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: str
    participation_type: ParticipationType
    payment_status: PaymentStatus
    reg_code: str | None = None
    qr_hash: str | None = None

    class Config:
        from_attributes = True

class RegistrationUpdate(BaseModel):
    user_id: uuid.UUID
    category: str | None = None
    participation_type: ParticipationType | None = None
    sub_category: str | None = None
    education_level: str | None = None
    student_class: str | None = None
    field_of_study: str | None = None
    graduation_year: int | None = None
    organization: str | None = None
    designation: str | None = None
    experience: int | None = None
    state: str | None = None
    city: str | None = None
    paper_title: str | None = None
    co_authors: list[dict] | None = None
    accompanying_count: int | None = None
