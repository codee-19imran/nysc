import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.payment import Payment
from app.models.registration import Registration, PaymentStatus
from app.models.user import User
from app.schemas.payment import (
    OrderCreateResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.services import razorpay_service, qr_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-order/{registration_id}", response_model=OrderCreateResponse)
def create_order(
    registration_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = (
        db.query(Registration)
        .filter(Registration.id == registration_id, Registration.user_id == user.id)
        .first()
    )
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if registration.payment_status == PaymentStatus.paid:
        raise HTTPException(status_code=400, detail="This registration is already paid for")

    amount = settings.CONFERENCE_FEE_PAISE
    order = razorpay_service.create_order(
        amount_paise=amount, receipt=str(registration.id)
    )

    payment = Payment(
        registration_id=registration.id,
        razorpay_order_id=order["id"],
        amount=amount / 100,  # store as rupees in the numeric column
        status="created",
    )
    db.add(payment)
    db.commit()

    return OrderCreateResponse(
        order_id=order["id"],
        amount=amount,
        currency="INR",
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        registration_id=registration.id,
    )


@router.post("/verify", response_model=PaymentVerifyResponse)
def verify_payment(
    payload: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(Payment.razorpay_order_id == payload.razorpay_order_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")

    registration = (
        db.query(Registration)
        .filter(Registration.id == payment.registration_id, Registration.user_id == user.id)
        .first()
    )
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    valid = razorpay_service.verify_payment_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    )
    if not valid:
        payment.status = "failed"
        registration.payment_status = PaymentStatus.failed
        db.commit()
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    # Mark payment + registration as paid
    payment.status = "paid"
    payment.razorpay_payment_id = payload.razorpay_payment_id
    registration.payment_status = PaymentStatus.paid

    # Generate a human-friendly registration code
    reg_code = f"NCYS-{str(registration.id)[:8].upper()}"
    registration.reg_code = reg_code

    # Generate/refresh the unified QR on the User (delegate type)
    # This ensures the scanner can look up the user by qr_hash in the users table
    qr_hash, qr_url = qr_service.generate_user_qr(str(user.id), "delegate")
    user.qr_hash = qr_hash
    # Also store on registration so Dashboard can serve the image
    registration.qr_hash = qr_hash

    db.commit()

    return PaymentVerifyResponse(
        status="paid",
        reg_code=reg_code,
        qr_code_url=qr_url,
        qr_hash=qr_hash,
        registration_id=registration.id
    )
