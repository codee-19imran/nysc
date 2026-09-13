from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.core.database import SessionLocal
from app.core.email import email_service
from app.models.user import User, UserRole
from app.models.registration import Registration
from app.models.website import DigitalCommunication, CommunicationStatus

logger = logging.getLogger(__name__)


def get_recipients_by_filter(db: Session, recipient_filter: str) -> list:
    """Get email list based on recipient filter."""
    if recipient_filter == 'all':
        users = db.query(User).filter(
            User.role.in_([UserRole.delegate, UserRole.presenter])
        ).all()
    elif recipient_filter in ['student', 'professional', 'accompanying']:
        user_ids = [r.user_id for r in db.query(Registration).filter(
            Registration.category == recipient_filter
        ).all()]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
    else:
        users = []
    
    return [u.email for u in users if u.email]


async def process_communication(communication_id: str):
    """Background task to process and send a communication."""
    db = SessionLocal()
    try:
        comm = db.query(DigitalCommunication).filter(
            DigitalCommunication.id == communication_id
        ).first()
        
        if not comm:
            logger.error(f"Communication {communication_id} not found")
            return
        
        # Update status to sending
        comm.status = CommunicationStatus.scheduled
        db.commit()
        
        # Get recipients
        recipients = get_recipients_by_filter(db, comm.recipient_filter)
        
        if not recipients:
            comm.status = CommunicationStatus.failed
            comm.failed_count = 0
            db.commit()
            logger.warning(f"No recipients for communication {communication_id}")
            return
        
        # Convert in-app to email if needed
        channel = comm.channel.value
        if channel == 'in_app':
            # For in-app, just mark as sent (would need notification system)
            comm.status = CommunicationStatus.sent
            comm.sent_at = datetime.utcnow()
            comm.recipient_count = len(recipients)
            comm.success_count = len(recipients)
            db.commit()
            return
        
        # Send emails
        result = await email_service.send_bulk(
            recipients=recipients,
            subject=comm.subject,
            html_body=comm.body,
            text_body=comm.body  # Simple fallback
        )
        
        # Update communication record
        comm.status = CommunicationStatus.sent if result['failed'] == 0 else CommunicationStatus.failed
        comm.sent_at = datetime.utcnow()
        comm.recipient_count = len(recipients)
        comm.success_count = result['success']
        comm.failed_count = result['failed']
        db.commit()
        
        logger.info(f"Communication {communication_id} processed: "
                   f"{result['success']} sent, {result['failed']} failed")
        
    except Exception as e:
        logger.error(f"Error processing communication {communication_id}: {str(e)}")
        try:
            comm = db.query(DigitalCommunication).filter(
                DigitalCommunication.id == communication_id
            ).first()
            if comm:
                comm.status = CommunicationStatus.failed
                db.commit()
        except:
            pass
    finally:
        db.close()


def queue_communication(background_tasks: BackgroundTasks, communication_id: str):
    """Queue a communication for background processing."""
    background_tasks.add_task(process_communication, communication_id)
