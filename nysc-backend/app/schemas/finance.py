from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import uuid


# ============ BUDGET ============

class BudgetItemBase(BaseModel):
    category: str
    description: str = Field(..., min_length=1, max_length=500)
    allocated_amount: float = 0
    spent_amount: float = 0
    financial_year: Optional[str] = None
    notes: Optional[str] = None
    status: str = "planned"


class BudgetItemCreate(BudgetItemBase):
    pass


class BudgetItemUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    allocated_amount: Optional[float] = None
    spent_amount: Optional[float] = None
    financial_year: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class BudgetItemResponse(BudgetItemBase):
    id: uuid.UUID
    remaining_amount: float = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ EXPENDITURES ============

class ExpenditureBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    category: str
    amount: float
    gst_amount: Optional[float] = 0
    total_amount: float
    expenditure_date: date
    committee: str
    payment_method: str
    paid_to: str
    paid_to_gstin: Optional[str] = None
    bill_id: Optional[uuid.UUID] = None
    status: str = "pending"
    notes: Optional[str] = None


class ExpenditureCreate(ExpenditureBase):
    pass


class ExpenditureUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    gst_amount: Optional[float] = None
    total_amount: Optional[float] = None
    expenditure_date: Optional[date] = None
    committee: Optional[str] = None
    payment_method: Optional[str] = None
    paid_to: Optional[str] = None
    paid_to_gstin: Optional[str] = None
    bill_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ExpenditureResponse(ExpenditureBase):
    id: uuid.UUID
    created_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ BILLS ============

class BillVoucherBase(BaseModel):
    bill_number: str
    vendor_name: str
    vendor_gstin: Optional[str] = None
    description: str
    amount: float
    gst_amount: Optional[float] = 0
    total_amount: float
    bill_date: date
    bill_type: str
    file_reference: Optional[str] = None
    verification_status: str = "pending"
    verification_notes: Optional[str] = None


class BillVoucherCreate(BillVoucherBase):
    pass


class BillVoucherUpdate(BaseModel):
    bill_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_gstin: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    gst_amount: Optional[float] = None
    total_amount: Optional[float] = None
    bill_date: Optional[date] = None
    bill_type: Optional[str] = None
    file_reference: Optional[str] = None
    verification_status: Optional[str] = None
    verification_notes: Optional[str] = None


class BillVoucherResponse(BillVoucherBase):
    id: uuid.UUID
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ PROCUREMENT ============

class ProcurementBase(BaseModel):
    item_name: str
    description: Optional[str] = None
    quantity: int = 1
    estimated_cost: float
    actual_cost: Optional[float] = None
    vendor_id: Optional[uuid.UUID] = None
    committee_requesting: str
    purchase_order_number: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery: Optional[date] = None
    received_date: Optional[date] = None
    status: str = "requested"
    notes: Optional[str] = None


class ProcurementCreate(ProcurementBase):
    pass


class ProcurementUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    vendor_id: Optional[uuid.UUID] = None
    committee_requesting: Optional[str] = None
    purchase_order_number: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery: Optional[date] = None
    received_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ProcurementResponse(ProcurementBase):
    id: uuid.UUID
    vendor_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ VENDORS ============

class VendorBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_details: Optional[str] = None
    category: str
    payment_terms: Optional[str] = None
    rating: Optional[int] = None
    status: str = "active"
    notes: Optional[str] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_details: Optional[str] = None
    category: Optional[str] = None
    payment_terms: Optional[str] = None
    rating: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class VendorResponse(VendorBase):
    id: uuid.UUID
    total_transactions: int
    total_amount: float
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ SPONSORSHIPS ============

class SponsorshipBase(BaseModel):
    sponsor_name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    sponsorship_type: str
    cash_amount: Optional[float] = 0
    in_kind_value: Optional[float] = 0
    in_kind_description: Optional[str] = None
    benefits_offered: Optional[str] = None
    tier: Optional[str] = None
    agreement_date: Optional[date] = None
    receipt_date: Optional[date] = None
    receipt_number: Optional[str] = None
    agreement_file: Optional[str] = None
    status: str = "prospective"
    notes: Optional[str] = None


class SponsorshipCreate(SponsorshipBase):
    pass


class SponsorshipUpdate(BaseModel):
    sponsor_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    sponsorship_type: Optional[str] = None
    cash_amount: Optional[float] = None
    in_kind_value: Optional[float] = None
    in_kind_description: Optional[str] = None
    benefits_offered: Optional[str] = None
    tier: Optional[str] = None
    agreement_date: Optional[date] = None
    receipt_date: Optional[date] = None
    receipt_number: Optional[str] = None
    agreement_file: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SponsorshipResponse(SponsorshipBase):
    id: uuid.UUID
    total_value: float = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ RECONCILIATION ============

class ReconciliationBase(BaseModel):
    reconciliation_type: str
    period_start: date
    period_end: date
    expected_amount: float
    actual_amount: float
    difference: float
    status: str = "pending"
    notes: Optional[str] = None


class ReconciliationCreate(ReconciliationBase):
    pass


class ReconciliationUpdate(BaseModel):
    reconciliation_type: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    expected_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    difference: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ReconciliationResponse(ReconciliationBase):
    id: uuid.UUID
    reconciled_by_name: Optional[str] = None
    reconciled_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ MEETINGS ============

class MeetingRecordBase(BaseModel):
    title: str
    meeting_type: str
    meeting_date: datetime
    duration_minutes: Optional[int] = None
    attendees: Optional[List[str]] = None
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    decisions: Optional[str] = None
    action_items: Optional[str] = None
    file_reference: Optional[str] = None


class MeetingRecordCreate(MeetingRecordBase):
    pass


class MeetingRecordUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    attendees: Optional[List[str]] = None
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    decisions: Optional[str] = None
    action_items: Optional[str] = None
    file_reference: Optional[str] = None


class MeetingRecordResponse(MeetingRecordBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ ADMIN FILES ============

class AdminFileBase(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    file_reference_number: Optional[str] = None
    file_date: Optional[date] = None
    file_reference: Optional[str] = None
    confidentiality: str = "internal"
    status: str = "active"
    notes: Optional[str] = None


class AdminFileCreate(AdminFileBase):
    pass


class AdminFileUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    file_reference_number: Optional[str] = None
    file_date: Optional[date] = None
    file_reference: Optional[str] = None
    confidentiality: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AdminFileResponse(AdminFileBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ STATS ============

class FinanceStatsResponse(BaseModel):
    total_budget: float
    total_spent: float
    remaining_budget: float
    registration_revenue: float
    sponsorship_income: float
    total_income: float
    pending_bills: int
    pending_expenditures: int
    active_procurements: int
    active_vendors: int
    confirmed_sponsors: int
    budget_utilization_percent: float
