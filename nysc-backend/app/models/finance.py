import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum, ForeignKey, JSON, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ============ ENUMS ============

class BudgetCategory(str, enum.Enum):
    venue = "venue"
    catering = "catering"
    logistics = "logistics"
    publicity = "publicity"
    technical = "technical"
    hospitality = "hospitality"
    administration = "administration"
    contingency = "contingency"
    sponsorship_benefits = "sponsorship_benefits"
    other = "other"


class BudgetStatus(str, enum.Enum):
    planned = "planned"
    approved = "approved"
    overspent = "overspent"


class ExpenditureStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    paid = "paid"
    rejected = "rejected"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    bank_transfer = "bank_transfer"
    upi = "upi"
    cheque = "cheque"
    card = "card"


class BillType(str, enum.Enum):
    invoice = "invoice"
    receipt = "receipt"
    voucher = "voucher"
    cash_memo = "cash_memo"
    credit_note = "credit_note"
    debit_note = "debit_note"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class ProcurementStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    ordered = "ordered"
    received = "received"
    cancelled = "cancelled"


class VendorCategory(str, enum.Enum):
    catering = "catering"
    printing = "printing"
    av_equipment = "av_equipment"
    transport = "transport"
    accommodation = "accommodation"
    stationery = "stationery"
    it_services = "it_services"
    other = "other"


class VendorStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    blacklisted = "blacklisted"


class SponsorshipType(str, enum.Enum):
    cash = "cash"
    in_kind = "in_kind"
    both = "both"


class SponsorshipStatus(str, enum.Enum):
    prospective = "prospective"
    in_discussion = "in_discussion"
    confirmed = "confirmed"
    received = "received"
    declined = "declined"


class ReconciliationStatus(str, enum.Enum):
    matched = "matched"
    mismatched = "mismatched"
    pending = "pending"


class MeetingType(str, enum.Enum):
    finance_committee = "finance_committee"
    coordination = "coordination"
    review = "review"
    audit = "audit"
    other = "other"


class FileCategory(str, enum.Enum):
    official_correspondence = "official_correspondence"
    institutional_docs = "institutional_docs"
    committee_docs = "committee_docs"
    certificates = "certificates"
    conference_files = "conference_files"
    legal = "legal"
    financial = "financial"
    other = "other"


class ConfidentialityLevel(str, enum.Enum):
    public = "public"
    internal = "internal"
    confidential = "confidential"
    restricted = "restricted"


# ============ BUDGET ============

class BudgetItem(Base):
    __tablename__ = "budget_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    category = Column(Enum(BudgetCategory), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    allocated_amount = Column(Numeric(15, 2), nullable=False, default=0)
    spent_amount = Column(Numeric(15, 2), nullable=False, default=0)
    financial_year = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Enum(BudgetStatus), default=BudgetStatus.planned, nullable=False)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ EXPENDITURES ============

class Expenditure(Base):
    __tablename__ = "expenditures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    description = Column(String(500), nullable=False)
    category = Column(Enum(BudgetCategory), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    gst_amount = Column(Numeric(15, 2), nullable=True, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False)
    expenditure_date = Column(Date, nullable=False, index=True)
    
    committee = Column(String(50), nullable=False, index=True)  # logistics/technical/etc.
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    paid_to = Column(String(255), nullable=False)
    paid_to_gstin = Column(String(20), nullable=True)
    
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills_vouchers.id"), nullable=True)
    
    status = Column(Enum(ExpenditureStatus), default=ExpenditureStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ BILLS & VOUCHERS ============

class BillVoucher(Base):
    __tablename__ = "bills_vouchers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    bill_number = Column(String(100), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False)
    vendor_gstin = Column(String(20), nullable=True)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    gst_amount = Column(Numeric(15, 2), nullable=True, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False)
    bill_date = Column(Date, nullable=False, index=True)
    
    bill_type = Column(Enum(BillType), nullable=False)
    file_reference = Column(String(500), nullable=True)  # Path to uploaded file
    
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.pending, nullable=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ PROCUREMENT ============

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    item_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    estimated_cost = Column(Numeric(15, 2), nullable=False)
    actual_cost = Column(Numeric(15, 2), nullable=True)
    
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    committee_requesting = Column(String(50), nullable=False, index=True)
    
    purchase_order_number = Column(String(100), nullable=True, index=True)
    order_date = Column(Date, nullable=True)
    expected_delivery = Column(Date, nullable=True)
    received_date = Column(Date, nullable=True)
    
    status = Column(Enum(ProcurementStatus), default=ProcurementStatus.requested, nullable=False)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ VENDORS ============

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    gstin = Column(String(20), nullable=True, index=True)
    pan = Column(String(20), nullable=True)
    bank_details = Column(Text, nullable=True)  # Encrypted in production
    
    category = Column(Enum(VendorCategory), nullable=False, index=True)
    payment_terms = Column(String(255), nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5
    
    total_transactions = Column(Integer, default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    
    status = Column(Enum(VendorStatus), default=VendorStatus.active, nullable=False)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ SPONSORSHIPS ============

class Sponsorship(Base):
    __tablename__ = "sponsorships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    sponsor_name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    
    sponsorship_type = Column(Enum(SponsorshipType), nullable=False)
    cash_amount = Column(Numeric(15, 2), nullable=True, default=0)
    in_kind_value = Column(Numeric(15, 2), nullable=True, default=0)
    in_kind_description = Column(Text, nullable=True)
    
    benefits_offered = Column(Text, nullable=True)
    tier = Column(String(50), nullable=True)  # Gold/Silver/Bronze/Platinum
    
    agreement_date = Column(Date, nullable=True)
    receipt_date = Column(Date, nullable=True)
    receipt_number = Column(String(100), nullable=True)
    agreement_file = Column(String(500), nullable=True)
    
    status = Column(Enum(SponsorshipStatus), default=SponsorshipStatus.prospective, nullable=False)
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


# ============ RECONCILIATION ============

class FinancialReconciliation(Base):
    __tablename__ = "financial_reconciliation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reconciliation_type = Column(String(50), nullable=False)  # registration/sponsorship/expenditure/procurement
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    expected_amount = Column(Numeric(15, 2), nullable=False)
    actual_amount = Column(Numeric(15, 2), nullable=False)
    difference = Column(Numeric(15, 2), nullable=False)
    
    status = Column(Enum(ReconciliationStatus), default=ReconciliationStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    
    reconciled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reconciled_at = Column(DateTime(timezone=True), nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ MEETING RECORDS ============

class MeetingRecord(Base):
    __tablename__ = "meeting_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    meeting_type = Column(Enum(MeetingType), nullable=False, index=True)
    meeting_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=True)
    
    attendees = Column(JSON, nullable=True)  # List of names
    agenda = Column(Text, nullable=True)
    minutes = Column(Text, nullable=True)
    decisions = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)
    
    file_reference = Column(String(500), nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ============ ADMINISTRATIVE FILES ============

class AdminFile(Base):
    __tablename__ = "admin_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    category = Column(Enum(FileCategory), nullable=False, index=True)
    description = Column(Text, nullable=True)
    file_reference_number = Column(String(100), nullable=True, index=True)
    
    file_date = Column(Date, nullable=True, index=True)
    file_reference = Column(String(500), nullable=True)  # Path to file
    
    confidentiality = Column(Enum(ConfidentialityLevel), default=ConfidentialityLevel.internal, nullable=False)
    status = Column(String(20), default="active")  # active / archived
    
    notes = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
