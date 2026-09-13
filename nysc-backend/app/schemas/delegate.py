from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class HelpRequestCreate(BaseModel):
    category: str = Field(..., pattern="^(registration|accommodation|transport|technical|meals|other)$")
    priority: str = Field("medium", pattern="^(low|medium|high|urgent)$")
    description: str = Field(..., min_length=10, max_length=1000)

class HelpRequest(BaseModel):
    id: str
    category: str
    priority: str
    description: str
    status: str
    resolution_notes: Optional[str] = None
    created_at: str

class DashboardOverview(BaseModel):
    pass

class ScheduleItem(BaseModel):
    pass

class IdCardStatus(BaseModel):
    pass

class MealRecord(BaseModel):
    pass

class MaterialRecord(BaseModel):
    pass

class AnnouncementItem(BaseModel):
    pass
