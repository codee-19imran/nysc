import uuid

from pydantic import BaseModel


class OrderCreateResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    razorpay_key_id: str
    registration_id: uuid.UUID


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    status: str
    reg_code: str
    qr_code_url: str
    qr_hash: str | None = None
    registration_id: uuid.UUID | None = None
