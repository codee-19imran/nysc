import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """SMTP email service with async support."""
    
    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_user = getattr(settings, 'SMTP_USER', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'FROM_EMAIL', self.smtp_user)
        self.from_name = getattr(settings, 'FROM_NAME', 'NYSC-2026 Conference')
        self.enabled = bool(self.smtp_user and self.smtp_password)
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """Send a single email."""
        if not self.enabled:
            logger.warning(f"Email service disabled. Would send to {to_email}: {subject}")
            return False
        
        try:
            message = MIMEMultipart('alternative')
            message['From'] = f"{self.from_name} <{self.from_email}>"
            message['To'] = to_email
            message['Subject'] = subject
            
            # Plain text fallback
            if text_body:
                message.attach(MIMEText(text_body, 'plain'))
            
            # HTML body
            message.attach(MIMEText(html_body, 'html'))
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True,
                start_tls=True
            )
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_bulk(
        self,
        recipients: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> dict:
        """Send emails to multiple recipients. Returns success/failed counts."""
        success = 0
        failed = 0
        
        for email in recipients:
            result = await self.send_email(email, subject, html_body, text_body)
            if result:
                success += 1
            else:
                failed += 1
        
        return {"success": success, "failed": failed}


# Singleton instance
email_service = EmailService()
