"""
All environment-based configuration lives here.
Every other file that needs a setting (DB URL, secret key, Razorpay keys)
imports `settings` from this file instead of reading os.environ directly.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Flat registration fee in INR paise (e.g. 500000 = ₹5,000).
    # Placeholder until conference committee finalizes the actual amount.
    CONFERENCE_FEE_PAISE: int = 500000

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = ""
    FROM_NAME: str = "NYSC-2026 Conference"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
