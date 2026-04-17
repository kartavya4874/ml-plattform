from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
import structlog
from app.models.models import ContactMessage

log = structlog.get_logger()
router = APIRouter(prefix="/contact", tags=["Contact"])

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str = ""
    message: str

@router.post("/")
async def submit_contact_form(data: ContactRequest):
    """Receive a contact message and store it."""
    msg = ContactMessage(
        name=data.name,
        email=data.email,
        subject=data.subject,
        message=data.message,
    )
    await msg.insert()
    log.info("contact_message_received", email=data.email, name=data.name)
    return {"message": "Message received"}
