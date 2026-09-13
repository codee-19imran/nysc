from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict
from datetime import datetime, date
from decimal import Decimal
import uuid
import csv
import io
import logging
import json

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.audit import log_action
from app.core.finance_security import require_super_admin
from app.models.user import User
from app.models.registration import Registration, PaymentStatus
from app.models.payment import Payment
from app.models.finance import (
    BudgetItem, Expenditure, BillVoucher, Procurement, Vendor,
    Sponsorship, FinancialReconciliation, MeetingRecord, AdminFile,
    BudgetCategory, ExpenditureStatus, BudgetStatus
)
from app.schemas.finance import (
    BudgetItemCreate, BudgetItemUpdate, BudgetItemResponse,
    ExpenditureCreate, ExpenditureUpdate, ExpenditureResponse,
    BillVoucherCreate, BillVoucherUpdate, BillVoucherResponse,
    ProcurementCreate, ProcurementUpdate, ProcurementResponse,
    VendorCreate, VendorUpdate, VendorResponse,
    SponsorshipCreate, SponsorshipUpdate, SponsorshipResponse,
    ReconciliationCreate, ReconciliationUpdate, ReconciliationResponse,
    MeetingRecordCreate, MeetingRecordUpdate, MeetingRecordResponse,
    AdminFileCreate, AdminFileUpdate, AdminFileResponse,
    FinanceStatsResponse
)
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/finance", tags=["finance"])


# ============ HELPER: CSV PARSING ============

def parse_csv(file_content: str) -> List[Dict]:
    """Parse CSV content into list of dicts."""
    reader = csv.DictReader(io.StringIO(file_content))
    return [row for row in reader]


def validate_csv_rows(rows: List[Dict], required_fields: List[str]) -> tuple[List[Dict], List[Dict]]:
    """Validate CSV rows, return (valid, invalid with errors)."""
    valid = []
    invalid = []
    
    for idx, row in enumerate(rows, 1):
        errors = []
        for field in required_fields:
            if field not in row or not row[field]:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            invalid.append({"row": idx, "data": row, "errors": errors})
        else:
            valid.append(row)
    
    return valid, invalid


# ============ STATS ============

@router.get("/stats", response_model=FinanceStatsResponse)
@limiter.limit("100/minute")
async def get_finance_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get finance dashboard statistics. Super Admin only."""
    require_super_admin(current_user)
    
    # Budget totals
    budget_items = db.query(BudgetItem).filter(BudgetItem.is_deleted == False).all()
    total_budget = sum(float(b.allocated_amount) for b in budget_items)
    total_spent = sum(float(b.spent_amount) for b in budget_items)
    remaining_budget = total_budget - total_spent
    
    # Registration revenue (read-only from payments)
    registration_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status.in_(['completed', 'paid'])
    ).scalar() or 0
    
    # Sponsorship income
    sponsorships = db.query(Sponsorship).filter(
        Sponsorship.is_deleted == False,
        Sponsorship.status.in_(['confirmed', 'received'])
    ).all()
    sponsorship_income = sum(
        (float(s.cash_amount or 0) + float(s.in_kind_value or 0)) 
        for s in sponsorships
    )
    
    total_income = float(registration_revenue) + sponsorship_income
    
    # Pending items
    pending_bills = db.query(BillVoucher).filter(
        BillVoucher.is_deleted == False,
        BillVoucher.verification_status == 'pending'
    ).count()
    
    pending_expenditures = db.query(Expenditure).filter(
        Expenditure.is_deleted == False,
        Expenditure.status == 'pending'
    ).count()
    
    active_procurements = db.query(Procurement).filter(
        Procurement.is_deleted == False,
        Procurement.status.in_(['requested', 'approved', 'ordered'])
    ).count()
    
    active_vendors = db.query(Vendor).filter(
        Vendor.is_deleted == False,
        Vendor.status == 'active'
    ).count()
    
    confirmed_sponsors = db.query(Sponsorship).filter(
        Sponsorship.is_deleted == False,
        Sponsorship.status.in_(['confirmed', 'received'])
    ).count()
    
    budget_utilization = (total_spent / total_budget * 100) if total_budget > 0 else 0
    
    return FinanceStatsResponse(
        total_budget=total_budget,
        total_spent=total_spent,
        remaining_budget=remaining_budget,
        registration_revenue=float(registration_revenue),
        sponsorship_income=sponsorship_income,
        total_income=total_income,
        pending_bills=pending_bills,
        pending_expenditures=pending_expenditures,
        active_procurements=active_procurements,
        active_vendors=active_vendors,
        confirmed_sponsors=confirmed_sponsors,
        budget_utilization_percent=round(budget_utilization, 2)
    )


# ============ REVENUE ============

@router.get("/registration-revenue")
@limiter.limit("100/minute")
async def get_registration_revenue(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    
    payments = db.query(Payment, Registration, User).join(
        Registration, Payment.registration_id == Registration.id
    ).join(
        User, Registration.user_id == User.id
    ).filter(
        Payment.status.in_(['completed', 'paid'])
    ).order_by(desc(Payment.created_at)).all()
    
    total_revenue = sum(float(p.Payment.amount) for p in payments)
    
    payment_list = []
    for p in payments:
        payment_list.append({
            "id": str(p.Payment.id),
            "user_name": p.User.name,
            "user_email": p.User.email,
            "amount": float(p.Payment.amount),
            "method": "online",
            "date": p.Payment.created_at.isoformat() if p.Payment.created_at else None
        })
        
    return {
        "summary": {
            "total_revenue": total_revenue
        },
        "payments": payment_list
    }


# ============ COMMITTEE EXPENDITURE ============

@router.get("/committee-expenditure")
@limiter.limit("100/minute")
async def get_committee_expenditure(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    
    expenditures = db.query(
        Expenditure.committee,
        func.sum(Expenditure.total_amount).label('total')
    ).filter(
        Expenditure.is_deleted == False,
        Expenditure.status == 'paid'
    ).group_by(Expenditure.committee).all()
    
    result = {}
    for row in expenditures:
        if row.committee:
            result[row.committee] = {"total": float(row.total or 0)}
            
    return result


# ============ SPONSORSHIPS ============

@router.get("/sponsorships")
@limiter.limit("100/minute")
async def get_sponsorships(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    
    sponsorships = db.query(Sponsorship).filter(
        Sponsorship.is_deleted == False
    ).order_by(desc(Sponsorship.created_at)).all()
    
    return [{
        "id": str(s.id),
        "sponsor_name": s.sponsor_name,
        "company": s.sponsor_name,
        "sponsorship_tier": s.tier,
        "cash_amount": float(s.cash_amount or 0),
        "in_kind_value": float(s.in_kind_value or 0),
        "total_value": float(s.cash_amount or 0) + float(s.in_kind_value or 0),
        "status": s.status.value if hasattr(s.status, 'value') else str(s.status),
        "date_received": s.receipt_date.isoformat() if s.receipt_date else None
    } for s in sponsorships]


# ============ BUDGET ============

@router.get("/budget", response_model=List[BudgetItemResponse])
@limiter.limit("100/minute")
async def get_budget(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    items = db.query(BudgetItem).filter(BudgetItem.is_deleted == False).order_by(BudgetItem.category).all()
    
    return [BudgetItemResponse(
        id=b.id, category=b.category.value, description=b.description,
        allocated_amount=float(b.allocated_amount), spent_amount=float(b.spent_amount),
        remaining_amount=float(b.allocated_amount - b.spent_amount),
        financial_year=b.financial_year, notes=b.notes, status=b.status.value,
        created_at=b.created_at
    ) for b in items]


@router.post("/budget", response_model=BudgetItemResponse)
@limiter.limit("30/minute")
async def create_budget_item(
    payload: BudgetItemCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    item = BudgetItem(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    
    log_action(db, current_user, "budget_created", "budget", item.id,
               {"category": item.category.value, "amount": float(item.allocated_amount)},
               request.client.host if request.client else None)
    
    return BudgetItemResponse(
        id=item.id, category=item.category.value, description=item.description,
        allocated_amount=float(item.allocated_amount), spent_amount=float(item.spent_amount),
        remaining_amount=float(item.allocated_amount - item.spent_amount),
        financial_year=item.financial_year, notes=item.notes, status=item.status.value,
        created_at=item.created_at
    )


@router.put("/budget/{item_id}", response_model=BudgetItemResponse)
@limiter.limit("60/minute")
async def update_budget_item(
    item_id: uuid.UUID,
    payload: BudgetItemUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    item = db.query(BudgetItem).filter(BudgetItem.id == item_id, BudgetItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found")
    
    old_values = {k: str(getattr(item, k)) for k in payload.dict(exclude_unset=True).keys()}
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    
    log_action(db, current_user, "budget_updated", "budget", item.id,
               {"changes": old_values}, request.client.host if request.client else None)
    
    return BudgetItemResponse(
        id=item.id, category=item.category.value, description=item.description,
        allocated_amount=float(item.allocated_amount), spent_amount=float(item.spent_amount),
        remaining_amount=float(item.allocated_amount - item.spent_amount),
        financial_year=item.financial_year, notes=item.notes, status=item.status.value,
        created_at=item.created_at
    )


@router.delete("/budget/{item_id}")
@limiter.limit("30/minute")
async def delete_budget_item(
    item_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    item = db.query(BudgetItem).filter(BudgetItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found")
    
    item.is_deleted = True  # Soft delete
    db.commit()
    
    log_action(db, current_user, "budget_deleted", "budget", item_id,
               {"description": item.description}, request.client.host if request.client else None)
    
    return {"message": "Budget item deleted (soft)"}


# ============ BUDGET IMPORT/EXPORT ============

@router.post("/budget/import")
@limiter.limit("10/minute")
async def import_budget(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,  # If True, just validate; if False, commit
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import budget items from CSV. Preview mode by default."""
    require_super_admin(current_user)
    
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    valid, invalid = validate_csv_rows(rows, ['category', 'description', 'allocated_amount'])
    
    # Parse amounts
    parsed_valid = []
    for row in valid:
        try:
            parsed_valid.append({
                "category": row['category'],
                "description": row['description'],
                "allocated_amount": float(row['allocated_amount']),
                "spent_amount": float(row.get('spent_amount', 0)),
                "financial_year": row.get('financial_year'),
                "notes": row.get('notes'),
                "status": row.get('status', 'planned')
            })
        except ValueError as e:
            invalid.append({"row": valid.index(row) + 1, "data": row, "errors": [f"Invalid amount: {e}"]})
    
    if preview:
        return {
            "preview": True,
            "valid_count": len(parsed_valid),
            "invalid_count": len(invalid),
            "valid_rows": parsed_valid[:5],  # Show first 5
            "invalid_rows": invalid[:10]
        }
    
    # Commit
    created = 0
    for row in parsed_valid:
        item = BudgetItem(**row)
        db.add(item)
        created += 1
    
    db.commit()
    
    log_action(db, current_user, "budget_imported", "system", None,
               {"count": created, "invalid": len(invalid)},
               request.client.host if request.client else None)
    
    return {"message": f"Imported {created} budget items", "invalid_skipped": len(invalid)}


@router.get("/budget/export")
@limiter.limit("10/minute")
async def export_budget(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    items = db.query(BudgetItem).filter(BudgetItem.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Category", "Description", "Allocated", "Spent", "Remaining", "Status", "Financial Year", "Notes"])
    
    for b in items:
        writer.writerow([
            b.category.value, b.description,
            float(b.allocated_amount), float(b.spent_amount),
            float(b.allocated_amount - b.spent_amount),
            b.status.value, b.financial_year or "", b.notes or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=budget.csv"}
    )


# ============ EXPENDITURES ============

@router.get("/expenditures", response_model=List[ExpenditureResponse])
@limiter.limit("100/minute")
async def get_expenditures(
    request: Request,
    committee: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    query = db.query(Expenditure).filter(Expenditure.is_deleted == False)
    
    if committee:
        query = query.filter(Expenditure.committee == committee)
    if status_filter:
        query = query.filter(Expenditure.status == status_filter)
    
    expenditures = query.order_by(desc(Expenditure.expenditure_date)).all()
    
    result = []
    for e in expenditures:
        creator = db.query(User).filter(User.id == e.created_by).first()
        result.append(ExpenditureResponse(
            id=e.id, description=e.description, category=e.category.value,
            amount=float(e.amount), gst_amount=float(e.gst_amount or 0),
            total_amount=float(e.total_amount), expenditure_date=e.expenditure_date,
            committee=e.committee, payment_method=e.payment_method.value,
            paid_to=e.paid_to, paid_to_gstin=e.paid_to_gstin,
            bill_id=e.bill_id, status=e.status.value, notes=e.notes,
            created_by_name=creator.name if creator else None,
            created_at=e.created_at
        ))
    
    return result


@router.post("/expenditures", response_model=ExpenditureResponse)
@limiter.limit("30/minute")
async def create_expenditure(
    payload: ExpenditureCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    exp = Expenditure(**payload.dict(), created_by=current_user.id)
    db.add(exp)
    db.commit()
    db.refresh(exp)
    
    # Auto-update budget spent amount
    budget = db.query(BudgetItem).filter(
        BudgetItem.category == exp.category,
        BudgetItem.is_deleted == False
    ).first()
    if budget and exp.status == 'paid':
        budget.spent_amount = float(budget.spent_amount) + float(exp.total_amount)
        db.commit()
    
    log_action(db, current_user, "expenditure_created", "expenditure", exp.id,
               {"amount": float(exp.total_amount), "committee": exp.committee},
               request.client.host if request.client else None)
    
    return exp


@router.delete("/expenditures/{exp_id}")
@limiter.limit("30/minute")
async def delete_expenditure(
    exp_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    exp = db.query(Expenditure).filter(Expenditure.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    
    exp.is_deleted = True
    db.commit()
    
    log_action(db, current_user, "expenditure_deleted", "expenditure", exp_id,
               {"amount": float(exp.total_amount)}, request.client.host if request.client else None)
    
    return {"message": "Expenditure deleted (soft)"}


@router.post("/expenditures/import")
@limiter.limit("10/minute")
async def import_expenditures(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    required = ['description', 'category', 'amount', 'total_amount', 'expenditure_date', 'committee', 'payment_method', 'paid_to']
    valid, invalid = validate_csv_rows(rows, required)
    
    parsed_valid = []
    for row in valid:
        try:
            parsed_valid.append({
                "description": row['description'],
                "category": row['category'],
                "amount": float(row['amount']),
                "gst_amount": float(row.get('gst_amount', 0)),
                "total_amount": float(row['total_amount']),
                "expenditure_date": date.fromisoformat(row['expenditure_date']),
                "committee": row['committee'],
                "payment_method": row['payment_method'],
                "paid_to": row['paid_to'],
                "paid_to_gstin": row.get('paid_to_gstin'),
                "status": row.get('status', 'pending'),
                "notes": row.get('notes')
            })
        except Exception as e:
            invalid.append({"row": valid.index(row) + 1, "data": row, "errors": [str(e)]})
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        exp = Expenditure(**row, created_by=current_user.id)
        db.add(exp)
        created += 1
    
    db.commit()
    log_action(db, current_user, "expenditures_imported", "system", None,
               {"count": created}, request.client.host if request.client else None)
    
    return {"message": f"Imported {created} expenditures", "invalid_skipped": len(invalid)}


@router.get("/expenditures/export")
@limiter.limit("10/minute")
async def export_expenditures(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    expenditures = db.query(Expenditure).filter(Expenditure.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Description", "Category", "Amount", "GST", "Total", "Date", "Committee", "Payment Method", "Paid To", "Status", "Notes"])
    
    for e in expenditures:
        writer.writerow([
            e.description, e.category.value, float(e.amount), float(e.gst_amount or 0),
            float(e.total_amount), e.expenditure_date.isoformat(), e.committee,
            e.payment_method.value, e.paid_to, e.status.value, e.notes or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenditures.csv"}
    )


# ============ BILLS ============

@router.get("/bills", response_model=List[BillVoucherResponse])
@limiter.limit("100/minute")
async def get_bills(
    request: Request,
    verification_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    query = db.query(BillVoucher).filter(BillVoucher.is_deleted == False)
    if verification_status:
        query = query.filter(BillVoucher.verification_status == verification_status)
    
    bills = query.order_by(desc(BillVoucher.bill_date)).all()
    
    result = []
    for b in bills:
        verified_by_name = None
        if b.verified_by:
            verifier = db.query(User).filter(User.id == b.verified_by).first()
            verified_by_name = verifier.name if verifier else None
        
        result.append(BillVoucherResponse(
            id=b.id, bill_number=b.bill_number, vendor_name=b.vendor_name,
            vendor_gstin=b.vendor_gstin, description=b.description,
            amount=float(b.amount), gst_amount=float(b.gst_amount or 0),
            total_amount=float(b.total_amount), bill_date=b.bill_date,
            bill_type=b.bill_type.value, file_reference=b.file_reference,
            verification_status=b.verification_status.value,
            verification_notes=b.verification_notes,
            verified_by_name=verified_by_name, verified_at=b.verified_at,
            created_at=b.created_at
        ))
    
    return result


@router.post("/bills", response_model=BillVoucherResponse)
@limiter.limit("30/minute")
async def create_bill(
    payload: BillVoucherCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    bill = BillVoucher(**payload.dict(), created_by=current_user.id)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    
    log_action(db, current_user, "bill_created", "bill", bill.id,
               {"bill_number": bill.bill_number, "amount": float(bill.total_amount)},
               request.client.host if request.client else None)
    
    return bill


@router.delete("/bills/{bill_id}")
@limiter.limit("30/minute")
async def delete_bill(
    bill_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    bill = db.query(BillVoucher).filter(BillVoucher.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    bill.is_deleted = True
    db.commit()
    return {"message": "Bill deleted (soft)"}


@router.post("/bills/import")
@limiter.limit("10/minute")
async def import_bills(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    required = ['bill_number', 'vendor_name', 'description', 'amount', 'total_amount', 'bill_date', 'bill_type']
    valid, invalid = validate_csv_rows(rows, required)
    
    parsed_valid = []
    for row in valid:
        try:
            parsed_valid.append({
                "bill_number": row['bill_number'],
                "vendor_name": row['vendor_name'],
                "vendor_gstin": row.get('vendor_gstin'),
                "description": row['description'],
                "amount": float(row['amount']),
                "gst_amount": float(row.get('gst_amount', 0)),
                "total_amount": float(row['total_amount']),
                "bill_date": date.fromisoformat(row['bill_date']),
                "bill_type": row['bill_type'],
                "file_reference": row.get('file_reference'),
                "verification_status": row.get('verification_status', 'pending')
            })
        except Exception as e:
            invalid.append({"row": valid.index(row) + 1, "data": row, "errors": [str(e)]})
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        bill = BillVoucher(**row, created_by=current_user.id)
        db.add(bill)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} bills", "invalid_skipped": len(invalid)}


@router.get("/bills/export")
@limiter.limit("10/minute")
async def export_bills(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    bills = db.query(BillVoucher).filter(BillVoucher.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Bill Number", "Vendor", "GSTIN", "Description", "Amount", "GST", "Total", "Date", "Type", "Verification", "File"])
    
    for b in bills:
        writer.writerow([
            b.bill_number, b.vendor_name, b.vendor_gstin or "", b.description,
            float(b.amount), float(b.gst_amount or 0), float(b.total_amount),
            b.bill_date.isoformat(), b.bill_type.value, b.verification_status.value,
            b.file_reference or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bills.csv"}
    )


# ============ PROCUREMENT ============

@router.get("/procurements", response_model=List[ProcurementResponse])
@limiter.limit("100/minute")
async def get_procurements(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    query = db.query(Procurement).filter(Procurement.is_deleted == False)
    if status_filter:
        query = query.filter(Procurement.status == status_filter)
    
    procurements = query.order_by(desc(Procurement.created_at)).all()
    
    result = []
    for p in procurements:
        vendor_name = None
        if p.vendor_id:
            vendor = db.query(Vendor).filter(Vendor.id == p.vendor_id).first()
            vendor_name = vendor.name if vendor else None
        
        result.append(ProcurementResponse(
            id=p.id, item_name=p.item_name, description=p.description,
            quantity=p.quantity, estimated_cost=float(p.estimated_cost),
            actual_cost=float(p.actual_cost) if p.actual_cost else None,
            vendor_id=p.vendor_id, vendor_name=vendor_name,
            committee_requesting=p.committee_requesting,
            purchase_order_number=p.purchase_order_number,
            order_date=p.order_date, expected_delivery=p.expected_delivery,
            received_date=p.received_date, status=p.status.value,
            notes=p.notes, created_at=p.created_at
        ))
    
    return result


@router.post("/procurements", response_model=ProcurementResponse)
@limiter.limit("30/minute")
async def create_procurement(
    payload: ProcurementCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    proc = Procurement(**payload.dict(), created_by=current_user.id)
    db.add(proc)
    db.commit()
    db.refresh(proc)
    return proc


@router.delete("/procurements/{proc_id}")
@limiter.limit("30/minute")
async def delete_procurement(
    proc_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    proc = db.query(Procurement).filter(Procurement.id == proc_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement not found")
    
    proc.is_deleted = True
    db.commit()
    return {"message": "Procurement deleted (soft)"}


@router.post("/procurements/import")
@limiter.limit("10/minute")
async def import_procurements(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    required = ['item_name', 'quantity', 'estimated_cost', 'committee_requesting']
    valid, invalid = validate_csv_rows(rows, required)
    
    parsed_valid = []
    for row in valid:
        try:
            parsed_valid.append({
                "item_name": row['item_name'],
                "description": row.get('description'),
                "quantity": int(row['quantity']),
                "estimated_cost": float(row['estimated_cost']),
                "actual_cost": float(row['actual_cost']) if row.get('actual_cost') else None,
                "committee_requesting": row['committee_requesting'],
                "purchase_order_number": row.get('purchase_order_number'),
                "status": row.get('status', 'requested'),
                "notes": row.get('notes')
            })
        except Exception as e:
            invalid.append({"row": valid.index(row) + 1, "data": row, "errors": [str(e)]})
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        proc = Procurement(**row, created_by=current_user.id)
        db.add(proc)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} procurements", "invalid_skipped": len(invalid)}


@router.get("/procurements/export")
@limiter.limit("10/minute")
async def export_procurements(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    procurements = db.query(Procurement).filter(Procurement.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Item", "Description", "Qty", "Estimated", "Actual", "Committee", "PO Number", "Status", "Order Date", "Expected", "Received"])
    
    for p in procurements:
        writer.writerow([
            p.item_name, p.description or "", p.quantity,
            float(p.estimated_cost), float(p.actual_cost) if p.actual_cost else "",
            p.committee_requesting, p.purchase_order_number or "",
            p.status.value,
            p.order_date.isoformat() if p.order_date else "",
            p.expected_delivery.isoformat() if p.expected_delivery else "",
            p.received_date.isoformat() if p.received_date else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=procurements.csv"}
    )


# ============ VENDORS ============

@router.get("/vendors", response_model=List[VendorResponse])
@limiter.limit("100/minute")
async def get_vendors(
    request: Request,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    query = db.query(Vendor).filter(Vendor.is_deleted == False)
    if category:
        query = query.filter(Vendor.category == category)
    
    vendors = query.order_by(Vendor.name).all()
    return vendors


@router.post("/vendors", response_model=VendorResponse)
@limiter.limit("30/minute")
async def create_vendor(
    payload: VendorCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    vendor = Vendor(**payload.dict())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    
    log_action(db, current_user, "vendor_created", "vendor", vendor.id,
               {"name": vendor.name}, request.client.host if request.client else None)
    
    return vendor


@router.delete("/vendors/{vendor_id}")
@limiter.limit("30/minute")
async def delete_vendor(
    vendor_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.is_deleted = True
    db.commit()
    return {"message": "Vendor deleted (soft)"}


@router.post("/vendors/import")
@limiter.limit("10/minute")
async def import_vendors(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    valid, invalid = validate_csv_rows(rows, ['name', 'category'])
    
    parsed_valid = []
    for row in valid:
        parsed_valid.append({
            "name": row['name'],
            "contact_person": row.get('contact_person'),
            "email": row.get('email'),
            "phone": row.get('phone'),
            "address": row.get('address'),
            "gstin": row.get('gstin'),
            "pan": row.get('pan'),
            "category": row['category'],
            "payment_terms": row.get('payment_terms'),
            "rating": int(row['rating']) if row.get('rating') else None,
            "status": row.get('status', 'active'),
            "notes": row.get('notes')
        })
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        vendor = Vendor(**row)
        db.add(vendor)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} vendors", "invalid_skipped": len(invalid)}


@router.get("/vendors/export")
@limiter.limit("10/minute")
async def export_vendors(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    vendors = db.query(Vendor).filter(Vendor.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Contact", "Email", "Phone", "Address", "GSTIN", "PAN", "Category", "Payment Terms", "Rating", "Status", "Total Transactions", "Total Amount"])
    
    for v in vendors:
        writer.writerow([
            v.name, v.contact_person or "", v.email or "", v.phone or "",
            v.address or "", v.gstin or "", v.pan or "", v.category.value,
            v.payment_terms or "", v.rating or "", v.status.value,
            v.total_transactions, float(v.total_amount)
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vendors.csv"}
    )


# ============ SPONSORSHIPS ============

@router.get("/sponsorships", response_model=List[SponsorshipResponse])
@limiter.limit("100/minute")
async def get_sponsorships(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    query = db.query(Sponsorship).filter(Sponsorship.is_deleted == False)
    if status_filter:
        query = query.filter(Sponsorship.status == status_filter)
    
    sponsorships = query.order_by(desc(Sponsorship.created_at)).all()
    
    result = []
    for s in sponsorships:
        total_value = float(s.cash_amount or 0) + float(s.in_kind_value or 0)
        result.append(SponsorshipResponse(
            id=s.id, sponsor_name=s.sponsor_name, contact_person=s.contact_person,
            email=s.email, phone=s.phone, sponsorship_type=s.sponsorship_type.value,
            cash_amount=float(s.cash_amount or 0), in_kind_value=float(s.in_kind_value or 0),
            in_kind_description=s.in_kind_description, benefits_offered=s.benefits_offered,
            tier=s.tier, agreement_date=s.agreement_date, receipt_date=s.receipt_date,
            receipt_number=s.receipt_number, agreement_file=s.agreement_file,
            status=s.status.value, notes=s.notes, total_value=total_value,
            created_at=s.created_at
        ))
    
    return result


@router.post("/sponsorships", response_model=SponsorshipResponse)
@limiter.limit("30/minute")
async def create_sponsorship(
    payload: SponsorshipCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    sponsorship = Sponsorship(**payload.dict(), created_by=current_user.id)
    db.add(sponsorship)
    db.commit()
    db.refresh(sponsorship)
    
    log_action(db, current_user, "sponsorship_created", "sponsorship", sponsorship.id,
               {"sponsor": sponsorship.sponsor_name, "amount": float(sponsorship.cash_amount or 0)},
               request.client.host if request.client else None)
    
    return sponsorship


@router.delete("/sponsorships/{sponsorship_id}")
@limiter.limit("30/minute")
async def delete_sponsorship(
    sponsorship_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    sponsorship = db.query(Sponsorship).filter(Sponsorship.id == sponsorship_id).first()
    if not sponsorship:
        raise HTTPException(status_code=404, detail="Sponsorship not found")
    
    sponsorship.is_deleted = True
    db.commit()
    return {"message": "Sponsorship deleted (soft)"}


@router.post("/sponsorships/import")
@limiter.limit("10/minute")
async def import_sponsorships(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    valid, invalid = validate_csv_rows(rows, ['sponsor_name', 'sponsorship_type'])
    
    parsed_valid = []
    for row in valid:
        parsed_valid.append({
            "sponsor_name": row['sponsor_name'],
            "contact_person": row.get('contact_person'),
            "email": row.get('email'),
            "phone": row.get('phone'),
            "sponsorship_type": row['sponsorship_type'],
            "cash_amount": float(row['cash_amount']) if row.get('cash_amount') else 0,
            "in_kind_value": float(row['in_kind_value']) if row.get('in_kind_value') else 0,
            "in_kind_description": row.get('in_kind_description'),
            "benefits_offered": row.get('benefits_offered'),
            "tier": row.get('tier'),
            "status": row.get('status', 'prospective'),
            "notes": row.get('notes')
        })
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        s = Sponsorship(**row, created_by=current_user.id)
        db.add(s)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} sponsorships", "invalid_skipped": len(invalid)}


@router.get("/sponsorships/export")
@limiter.limit("10/minute")
async def export_sponsorships(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    sponsorships = db.query(Sponsorship).filter(Sponsorship.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Sponsor", "Contact", "Email", "Phone", "Type", "Cash", "In-Kind Value", "Tier", "Status", "Agreement Date", "Receipt Date"])
    
    for s in sponsorships:
        writer.writerow([
            s.sponsor_name, s.contact_person or "", s.email or "", s.phone or "",
            s.sponsorship_type.value, float(s.cash_amount or 0), float(s.in_kind_value or 0),
            s.tier or "", s.status.value,
            s.agreement_date.isoformat() if s.agreement_date else "",
            s.receipt_date.isoformat() if s.receipt_date else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sponsorships.csv"}
    )


# ============ REGISTRATION REVENUE (Read-only) ============

@router.get("/registration-revenue")
@limiter.limit("100/minute")
async def get_registration_revenue(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Read-only view of registration revenue. Super Admin only."""
    require_super_admin(current_user)
    
    payments = db.query(Payment).filter(Payment.status == 'completed').order_by(desc(Payment.created_at)).limit(500).all()
    
    result = []
    for p in payments:
        user = db.query(User).filter(User.id == p.user_id).first()
        result.append({
            "id": str(p.id),
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "amount": float(p.amount) if hasattr(p, 'amount') else 0,
            "method": p.method if hasattr(p, 'method') else "unknown",
            "status": p.status,
            "date": p.created_at.isoformat() if hasattr(p, 'created_at') else None
        })
    
    # Summary
    total = sum(float(p.amount) if hasattr(p, 'amount') else 0 for p in payments)
    
    return {
        "payments": result,
        "summary": {
            "total_revenue": total,
            "transaction_count": len(result)
        }
    }


# ============ COMMITTEE EXPENDITURE ============

@router.get("/committee-expenditure")
@limiter.limit("100/minute")
async def get_committee_expenditure(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenditure breakdown by committee."""
    require_super_admin(current_user)
    
    committees = ['logistics', 'technical', 'hospitality', 'website', 'media', 'administration']
    result = {}
    
    for committee in committees:
        expenditures = db.query(Expenditure).filter(
            Expenditure.is_deleted == False,
            Expenditure.committee == committee
        ).all()
        
        total = sum(float(e.total_amount) for e in expenditures)
        by_category = {}
        for e in expenditures:
            cat = e.category.value
            by_category[cat] = by_category.get(cat, 0) + float(e.total_amount)
        
        result[committee] = {
            "total": total,
            "count": len(expenditures),
            "by_category": by_category
        }
    
    return result


# ============ RECONCILIATION ============

@router.get("/reconciliation", response_model=List[ReconciliationResponse])
@limiter.limit("100/minute")
async def get_reconciliations(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    recs = db.query(FinancialReconciliation).filter(
        FinancialReconciliation.is_deleted == False
    ).order_by(desc(FinancialReconciliation.period_start)).all()
    
    result = []
    for r in recs:
        reconciled_by_name = None
        if r.reconciled_by:
            reconciler = db.query(User).filter(User.id == r.reconciled_by).first()
            reconciled_by_name = reconciler.name if reconciler else None
        
        result.append(ReconciliationResponse(
            id=r.id, reconciliation_type=r.reconciliation_type,
            period_start=r.period_start, period_end=r.period_end,
            expected_amount=float(r.expected_amount), actual_amount=float(r.actual_amount),
            difference=float(r.difference), status=r.status.value, notes=r.notes,
            reconciled_by_name=reconciled_by_name, reconciled_at=r.reconciled_at,
            created_at=r.created_at
        ))
    
    return result


@router.post("/reconciliation", response_model=ReconciliationResponse)
@limiter.limit("30/minute")
async def create_reconciliation(
    payload: ReconciliationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    rec = FinancialReconciliation(**payload.dict())
    if payload.status == 'matched':
        rec.reconciled_by = current_user.id
        rec.reconciled_at = datetime.utcnow()
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/reconciliation/{rec_id}")
@limiter.limit("30/minute")
async def delete_reconciliation(
    rec_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    rec = db.query(FinancialReconciliation).filter(FinancialReconciliation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    
    rec.is_deleted = True
    db.commit()
    return {"message": "Reconciliation deleted (soft)"}


@router.post("/reconciliation/import")
@limiter.limit("10/minute")
async def import_reconciliation(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    required = ['reconciliation_type', 'period_start', 'period_end', 'expected_amount', 'actual_amount', 'difference']
    valid, invalid = validate_csv_rows(rows, required)
    
    parsed_valid = []
    for row in valid:
        try:
            parsed_valid.append({
                "reconciliation_type": row['reconciliation_type'],
                "period_start": date.fromisoformat(row['period_start']),
                "period_end": date.fromisoformat(row['period_end']),
                "expected_amount": float(row['expected_amount']),
                "actual_amount": float(row['actual_amount']),
                "difference": float(row['difference']),
                "status": row.get('status', 'pending'),
                "notes": row.get('notes')
            })
        except Exception as e:
            invalid.append({"row": valid.index(row) + 1, "data": row, "errors": [str(e)]})
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        rec = FinancialReconciliation(**row)
        db.add(rec)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} reconciliation records", "invalid_skipped": len(invalid)}


@router.get("/reconciliation/export")
@limiter.limit("10/minute")
async def export_reconciliation(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    recs = db.query(FinancialReconciliation).filter(FinancialReconciliation.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Type", "Period Start", "Period End", "Expected", "Actual", "Difference", "Status", "Notes"])
    
    for r in recs:
        writer.writerow([
            r.reconciliation_type, r.period_start.isoformat(), r.period_end.isoformat(),
            float(r.expected_amount), float(r.actual_amount), float(r.difference),
            r.status.value, r.notes or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reconciliation.csv"}
    )


# ============ MEETINGS ============

@router.get("/meetings", response_model=List[MeetingRecordResponse])
@limiter.limit("100/minute")
async def get_meetings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    meetings = db.query(MeetingRecord).filter(MeetingRecord.is_deleted == False).order_by(desc(MeetingRecord.meeting_date)).all()
    return meetings


@router.post("/meetings", response_model=MeetingRecordResponse)
@limiter.limit("30/minute")
async def create_meeting(
    payload: MeetingRecordCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    meeting = MeetingRecord(**payload.dict(), created_by=current_user.id)
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    log_action(db, current_user, "meeting_created", "meeting", meeting.id,
               {"title": meeting.title}, request.client.host if request.client else None)
    
    return meeting


@router.delete("/meetings/{meeting_id}")
@limiter.limit("30/minute")
async def delete_meeting(
    meeting_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    meeting = db.query(MeetingRecord).filter(MeetingRecord.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting.is_deleted = True
    db.commit()
    return {"message": "Meeting deleted (soft)"}


@router.post("/meetings/import")
@limiter.limit("10/minute")
async def import_meetings(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    valid, invalid = validate_csv_rows(rows, ['title', 'meeting_type', 'meeting_date'])
    
    parsed_valid = []
    for row in valid:
        try:
            attendees = row.get('attendees', '').split(';') if row.get('attendees') else []
            parsed_valid.append({
                "title": row['title'],
                "meeting_type": row['meeting_type'],
                "meeting_date": datetime.fromisoformat(row['meeting_date']),
                "duration_minutes": int(row['duration_minutes']) if row.get('duration_minutes') else None,
                "attendees": attendees,
                "agenda": row.get('agenda'),
                "minutes": row.get('minutes'),
                "decisions": row.get('decisions'),
                "action_items": row.get('action_items'),
                "file_reference": row.get('file_reference')
            })
        except Exception as e:
            invalid.append({"row": valid.index(row) + 1, "data": row, "errors": [str(e)]})
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        m = MeetingRecord(**row, created_by=current_user.id)
        db.add(m)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} meetings", "invalid_skipped": len(invalid)}


@router.get("/meetings/export")
@limiter.limit("10/minute")
async def export_meetings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    meetings = db.query(MeetingRecord).filter(MeetingRecord.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Type", "Date", "Duration", "Attendees", "Agenda", "Minutes", "Decisions", "Action Items"])
    
    for m in meetings:
        writer.writerow([
            m.title, m.meeting_type.value, m.meeting_date.isoformat(),
            m.duration_minutes or "",
            "; ".join(m.attendees) if m.attendees else "",
            m.agenda or "", m.minutes or "", m.decisions or "", m.action_items or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=meetings.csv"}
    )


# ============ ADMIN FILES ============

@router.get("/admin-files", response_model=List[AdminFileResponse])
@limiter.limit("100/minute")
async def get_admin_files(
    request: Request,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    query = db.query(AdminFile).filter(AdminFile.is_deleted == False)
    if category:
        query = query.filter(AdminFile.category == category)
    
    return query.order_by(desc(AdminFile.file_date)).all()


@router.post("/admin-files", response_model=AdminFileResponse)
@limiter.limit("30/minute")
async def create_admin_file(
    payload: AdminFileCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    file = AdminFile(**payload.dict(), created_by=current_user.id)
    db.add(file)
    db.commit()
    db.refresh(file)
    
    log_action(db, current_user, "admin_file_created", "admin_file", file.id,
               {"title": file.title, "confidentiality": file.confidentiality.value},
               request.client.host if request.client else None)
    
    return file


@router.delete("/admin-files/{file_id}")
@limiter.limit("30/minute")
async def delete_admin_file(
    file_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    file = db.query(AdminFile).filter(AdminFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    file.is_deleted = True
    db.commit()
    return {"message": "File deleted (soft)"}


@router.post("/admin-files/import")
@limiter.limit("10/minute")
async def import_admin_files(
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    content = await file.read()
    rows = parse_csv(content.decode('utf-8'))
    valid, invalid = validate_csv_rows(rows, ['title', 'category'])
    
    parsed_valid = []
    for row in valid:
        parsed_valid.append({
            "title": row['title'],
            "category": row['category'],
            "description": row.get('description'),
            "file_reference_number": row.get('file_reference_number'),
            "file_date": date.fromisoformat(row['file_date']) if row.get('file_date') else None,
            "file_reference": row.get('file_reference'),
            "confidentiality": row.get('confidentiality', 'internal'),
            "status": row.get('status', 'active'),
            "notes": row.get('notes')
        })
    
    if preview:
        return {"preview": True, "valid_count": len(parsed_valid), "invalid_count": len(invalid),
                "valid_rows": parsed_valid[:5], "invalid_rows": invalid[:10]}
    
    created = 0
    for row in parsed_valid:
        f = AdminFile(**row, created_by=current_user.id)
        db.add(f)
        created += 1
    
    db.commit()
    return {"message": f"Imported {created} files", "invalid_skipped": len(invalid)}


@router.get("/admin-files/export")
@limiter.limit("10/minute")
async def export_admin_files(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_super_admin(current_user)
    files = db.query(AdminFile).filter(AdminFile.is_deleted == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Category", "Description", "Reference Number", "Date", "File Path", "Confidentiality", "Status"])
    
    for f in files:
        writer.writerow([
            f.title, f.category.value, f.description or "",
            f.file_reference_number or "", 
            f.file_date.isoformat() if f.file_date else "",
            f.file_reference or "", f.confidentiality.value, f.status
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=admin_files.csv"}
    )


# ============ SEED PRE-LOADED DATA ============

@router.post("/seed")
@limiter.limit("1/minute")
async def seed_finance_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Seed pre-loaded finance data. Run once. Super Admin only."""
    require_super_admin(current_user)
    
    if db.query(BudgetItem).count() > 0:
        return {"message": "Data already seeded", "skipped": True}
    
    # --- 10 Budget Categories ---
    budget_data = [
        {"category": "venue", "description": "Venue rental and setup", "allocated_amount": 500000},
        {"category": "catering", "description": "Food and refreshments", "allocated_amount": 400000},
        {"category": "logistics", "description": "Transport and equipment", "allocated_amount": 200000},
        {"category": "publicity", "description": "Marketing and publicity", "allocated_amount": 150000},
        {"category": "technical", "description": "Technical arrangements", "allocated_amount": 180000},
        {"category": "hospitality", "description": "Guest hospitality", "allocated_amount": 250000},
        {"category": "administration", "description": "Administrative expenses", "allocated_amount": 100000},
        {"category": "contingency", "description": "Contingency fund", "allocated_amount": 120000},
        {"category": "sponsorship_benefits", "description": "Sponsor benefits delivery", "allocated_amount": 80000},
        {"category": "other", "description": "Miscellaneous expenses", "allocated_amount": 50000},
    ]
    
    for b_data in budget_data:
        item = BudgetItem(**b_data, status='approved', financial_year="2026-27")
        db.add(item)
    
    # --- 5 Sample Expenditures ---
    expenditure_data = [
        {"description": "Venue advance payment", "category": "venue", "amount": 200000,
         "gst_amount": 36000, "total_amount": 236000, "expenditure_date": date(2026, 9, 1),
         "committee": "logistics", "payment_method": "bank_transfer", "paid_to": "University Auditorium",
         "status": "paid"},
        {"description": "Catering advance", "category": "catering", "amount": 100000,
         "gst_amount": 5000, "total_amount": 105000, "expenditure_date": date(2026, 9, 5),
         "committee": "hospitality", "payment_method": "bank_transfer", "paid_to": "Hotel Catering Services",
         "status": "paid"},
        {"description": "Banner printing", "category": "publicity", "amount": 15000,
         "gst_amount": 2700, "total_amount": 17700, "expenditure_date": date(2026, 9, 10),
         "committee": "media", "payment_method": "upi", "paid_to": "Print Shop",
         "status": "paid"},
        {"description": "Projector rental", "category": "technical", "amount": 25000,
         "gst_amount": 4500, "total_amount": 29500, "expenditure_date": date(2026, 9, 12),
         "committee": "technical", "payment_method": "cheque", "paid_to": "AV Solutions",
         "status": "approved"},
        {"description": "Guest transportation", "category": "hospitality", "amount": 18000,
         "gst_amount": 0, "total_amount": 18000, "expenditure_date": date(2026, 9, 13),
         "committee": "hospitality", "payment_method": "cash", "paid_to": "Taxi Service",
         "status": "pending"},
    ]
    
    for e_data in expenditure_data:
        exp = Expenditure(**e_data, created_by=current_user.id)
        db.add(exp)
    
    # --- 5 Sample Bills ---
    bill_data = [
        {"bill_number": "INV-001", "vendor_name": "University Auditorium", "description": "Venue advance",
         "amount": 200000, "gst_amount": 36000, "total_amount": 236000,
         "bill_date": date(2026, 9, 1), "bill_type": "invoice", "verification_status": "verified"},
        {"bill_number": "INV-002", "vendor_name": "Hotel Catering Services", "description": "Catering advance",
         "amount": 100000, "gst_amount": 5000, "total_amount": 105000,
         "bill_date": date(2026, 9, 5), "bill_type": "invoice", "verification_status": "verified"},
        {"bill_number": "BILL-003", "vendor_name": "Print Shop", "description": "Banner printing",
         "amount": 15000, "gst_amount": 2700, "total_amount": 17700,
         "bill_date": date(2026, 9, 10), "bill_type": "cash_memo", "verification_status": "pending"},
        {"bill_number": "INV-004", "vendor_name": "AV Solutions", "description": "Projector rental",
         "amount": 25000, "gst_amount": 4500, "total_amount": 29500,
         "bill_date": date(2026, 9, 12), "bill_type": "invoice", "verification_status": "pending"},
        {"bill_number": "REC-005", "vendor_name": "Taxi Service", "description": "Guest transport",
         "amount": 18000, "gst_amount": 0, "total_amount": 18000,
         "bill_date": date(2026, 9, 13), "bill_type": "receipt", "verification_status": "pending"},
    ]
    
    for b_data in bill_data:
        bill = BillVoucher(**b_data, created_by=current_user.id)
        db.add(bill)
    
    # --- 4 Sample Vendors ---
    vendor_data = [
        {"name": "University Auditorium", "contact_person": "Admin Officer",
         "email": "admin@university.edu", "phone": "9876543210", "category": "accommodation",
         "gstin": "29AAACU1234F1Z5", "payment_terms": "Net 30", "rating": 5},
        {"name": "Hotel Catering Services", "contact_person": "Manager",
         "email": "manager@hotel.com", "phone": "9876543211", "category": "catering",
         "gstin": "29AAACH5678G2Z6", "payment_terms": "50% advance", "rating": 4},
        {"name": "AV Solutions", "contact_person": "Technical Head",
         "email": "tech@avsolutions.com", "phone": "9876543212", "category": "av_equipment",
         "gstin": "29AAACA9012H3Z7", "payment_terms": "On delivery", "rating": 4},
        {"name": "Print Shop", "contact_person": "Owner",
         "email": "owner@printshop.com", "phone": "9876543213", "category": "printing",
         "payment_terms": "Cash", "rating": 3},
    ]
    
    for v_data in vendor_data:
        vendor = Vendor(**v_data)
        db.add(vendor)
    
    # --- 4 Sample Sponsorships ---
    sponsorship_data = [
        {"sponsor_name": "TechCorp India", "contact_person": "CSR Head",
         "email": "csr@techcorp.com", "phone": "9876543220",
         "sponsorship_type": "cash", "cash_amount": 200000,
         "tier": "Gold", "benefits_offered": "Logo on banner, booth, 2 delegate passes",
         "status": "received", "agreement_date": date(2026, 7, 1), "receipt_date": date(2026, 7, 15)},
        {"sponsor_name": "GreenEnergy Ltd", "contact_person": "Marketing Director",
         "email": "marketing@greenenergy.com", "phone": "9876543221",
         "sponsorship_type": "cash", "cash_amount": 100000,
         "tier": "Silver", "benefits_offered": "Logo on brochure, 1 delegate pass",
         "status": "confirmed", "agreement_date": date(2026, 8, 1)},
        {"sponsor_name": "AV Solutions", "contact_person": "Technical Head",
         "email": "tech@avsolutions.com", "phone": "9876543212",
         "sponsorship_type": "in_kind", "in_kind_value": 50000,
         "in_kind_description": "Free projector and sound system for 2 days",
         "tier": "In-Kind Partner", "status": "confirmed", "agreement_date": date(2026, 8, 15)},
        {"sponsor_name": "Academic Publishers", "contact_person": "Sales Manager",
         "email": "sales@publishers.com", "phone": "9876543222",
         "sponsorship_type": "both", "cash_amount": 25000, "in_kind_value": 30000,
         "in_kind_description": "Conference proceedings printing",
         "tier": "Bronze", "status": "in_discussion"},
    ]
    
    for s_data in sponsorship_data:
        sponsorship = Sponsorship(**s_data, created_by=current_user.id)
        db.add(sponsorship)
    
    # --- 3 Sample Reconciliations ---
    reconciliation_data = [
        {"reconciliation_type": "registration", "period_start": date(2026, 8, 1),
         "period_end": date(2026, 8, 31), "expected_amount": 500000,
         "actual_amount": 495000, "difference": -5000, "status": "mismatched",
         "notes": "₹5000 difference due to failed transaction"},
        {"reconciliation_type": "sponsorship", "period_start": date(2026, 7, 1),
         "period_end": date(2026, 9, 13), "expected_amount": 325000,
         "actual_amount": 325000, "difference": 0, "status": "matched"},
        {"reconciliation_type": "expenditure", "period_start": date(2026, 9, 1),
         "period_end": date(2026, 9, 13), "expected_amount": 406200,
         "actual_amount": 406200, "difference": 0, "status": "matched"},
    ]
    
    for r_data in reconciliation_data:
        rec = FinancialReconciliation(**r_data)
        db.add(rec)
    
    # --- 3 Sample Meetings ---
    meeting_data = [
        {"title": "Finance Committee Meeting #1", "meeting_type": "finance_committee",
         "meeting_date": datetime(2026, 8, 1, 10, 0), "duration_minutes": 90,
         "attendees": ["Finance Chair", "Treasurer", "Admin Officer"],
         "agenda": "Budget approval, vendor selection",
         "minutes": "Budget approved with minor revisions. Vendors shortlisted.",
         "decisions": "Budget approved. 4 vendors selected.",
         "action_items": "Send POs to vendors by Aug 10"},
        {"title": "Coordination Meeting", "meeting_type": "coordination",
         "meeting_date": datetime(2026, 9, 1, 14, 0), "duration_minutes": 60,
         "attendees": ["All Committee Heads"],
         "agenda": "Final coordination before event",
         "minutes": "All committees reported readiness. Minor issues flagged.",
         "decisions": "Emergency fund of ₹50k approved for contingencies",
         "action_items": "Each head to submit final expense report by Sept 20"},
        {"title": "Post-Event Review", "meeting_type": "review",
         "meeting_date": datetime(2026, 9, 15, 11, 0), "duration_minutes": 120,
         "attendees": ["Finance Chair", "All Committee Heads"],
         "agenda": "Review actual vs budget, lessons learned",
         "minutes": "Meeting scheduled for post-event review",
         "decisions": "Pending",
         "action_items": "All heads to prepare expense summaries"},
    ]
    
    for m_data in meeting_data:
        meeting = MeetingRecord(**m_data, created_by=current_user.id)
        db.add(meeting)
    
    # --- 4 Sample Admin Files ---
    file_data = [
        {"title": "Conference Budget Approval Letter", "category": "financial",
         "description": "Official budget approval from university",
         "file_reference_number": "FIN/2026/001", "file_date": date(2026, 7, 15),
         "confidentiality": "confidential", "status": "active"},
        {"title": "Vendor Agreement - Hotel Catering", "category": "legal",
         "description": "Signed agreement with catering vendor",
         "file_reference_number": "LEG/2026/002", "file_date": date(2026, 8, 5),
         "confidentiality": "confidential", "status": "active"},
        {"title": "Sponsorship Agreement - TechCorp", "category": "legal",
         "description": "Signed sponsorship agreement",
         "file_reference_number": "LEG/2026/003", "file_date": date(2026, 7, 1),
         "confidentiality": "confidential", "status": "active"},
        {"title": "Conference Official File", "category": "conference_files",
         "description": "Main conference file with all approvals",
         "file_reference_number": "CONF/2026/001", "file_date": date(2026, 6, 1),
         "confidentiality": "internal", "status": "active"},
    ]
    
    for f_data in file_data:
        file = AdminFile(**f_data, created_by=current_user.id)
        db.add(file)
    
    db.commit()
    
    log_action(db, current_user, "finance_data_seeded", "system", None,
               {"budget": 10, "expenditures": 5, "bills": 5, "vendors": 4,
                "sponsorships": 4, "reconciliations": 3, "meetings": 3, "files": 4},
               request.client.host if request.client else None)
    
    return {
        "message": "Finance data seeded successfully",
        "counts": {
            "budget": 10, "expenditures": 5, "bills": 5, "vendors": 4,
            "sponsorships": 4, "reconciliations": 3, "meetings": 3, "files": 4
        }
    }
