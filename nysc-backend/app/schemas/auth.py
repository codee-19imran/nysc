import uuid
from pydantic import BaseModel, EmailStr, model_validator
from typing import Optional

class UserSignup(BaseModel):
    # --- Universal Mandatory Fields ---
    name: str
    email: EmailStr
    password: str
    phone: str
    state: str
    city: str
    category: str  # 'student' or 'professional'
    participation_type: Optional[str] = None

    # --- Conditional Fields ---
    # Note: We use Optional here so the schema doesn't instantly reject 
    # a professional for missing a student field. The @model_validator 
    # below is the strict gatekeeper that prevents loopholes.
    institution: Optional[str] = None
    education_level: Optional[str] = None
    student_class: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[int] = None
    organization: Optional[str] = None
    designation: Optional[str] = None
    experience: Optional[int] = None

    @model_validator(mode='after')
    def validate_conditional_fields(self):
        if self.category == 'student':
            if not self.institution:
                raise ValueError('Institution is required for students.')
            if not self.education_level:
                raise ValueError('Education level is required for students.')
            
            if self.education_level == 'School (Class 9-12)':
                if not self.student_class:
                    raise ValueError('Class is required for school students.')
            else:
                if not self.field_of_study:
                    raise ValueError('Field of study is required for college students.')
                if not self.graduation_year:
                    raise ValueError('Graduation year is required for college students.')
                    
        elif self.category == 'professional':
            if not self.organization:
                raise ValueError('Organization is required for professionals.')
            if not self.designation:
                raise ValueError('Designation is required for professionals.')
            if self.experience is None:
                raise ValueError('Experience is required for professionals.')
        else:
            raise ValueError('Invalid category. Must be student or professional.')
            
        return self

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    qr_hash: Optional[str] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Add this to the bottom of app/schemas/auth.py

class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    state: str
    city: str
    category: str
    participation_type: Optional[str] = None
    
    institution: Optional[str] = None
    education_level: Optional[str] = None
    student_class: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[int] = None
    organization: Optional[str] = None
    designation: Optional[str] = None
    experience: Optional[int] = None
    password: Optional[str] = None # Optional for updates

    @model_validator(mode='after')
    def validate_conditional_fields(self):
        if self.category == 'student':
            if not self.institution:
                raise ValueError('Institution is required for students.')
            if not self.education_level:
                raise ValueError('Education level is required for students.')
            
            if self.education_level == 'School (Class 9-12)':
                if not self.student_class:
                    raise ValueError('Class is required for school students.')
            else:
                if not self.field_of_study:
                    raise ValueError('Field of study is required for college students.')
                if not self.graduation_year:
                    raise ValueError('Graduation year is required for college students.')
                    
        elif self.category == 'professional':
            if not self.organization:
                raise ValueError('Organization is required for professionals.')
            if not self.designation:
                raise ValueError('Designation is required for professionals.')
            if self.experience is None:
                raise ValueError('Experience is required for professionals.')
        else:
            raise ValueError('Invalid category. Must be student or professional.')
            
        return self