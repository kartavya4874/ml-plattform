"""Email service — Resend HTTP API integration with Jinja2-style templates."""
import httpx
from app.core.config import settings
import structlog
import asyncio

log = structlog.get_logger()

async def _send_email(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY:
        log.info("email.skipped", reason="Resend API key not configured", to=to, subject=subject)
        return

    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            response.raise_for_status()
            log.info("email.sent", to=to, subject=subject, resend_id=response.json().get("id"))
    except Exception as exc:
        log.error("email.failed", error=str(exc), to=to)


async def send_verification_email(to: str, token: str) -> None:
    verify_url = f"{settings.FRONTEND_URL}/verify/{token}"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Welcome to Parametrix AI!</h2>
      <p>Click the button below to verify your email address:</p>
      <a href="{verify_url}" style="
        display: inline-block;
        background: #4F46E5;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
      ">Verify Email</a>
      <p style="color: #6B7280; font-size: 14px;">This link expires in 24 hours.</p>
    </div>
    """
    await _send_email(to, "Verify your Parametrix AI email", html)


async def send_training_complete_email(to: str, model_name: str, metrics: dict) -> None:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">🎉 Training Complete!</h2>
      <p>Your model <strong>{model_name}</strong> has finished training.</p>
      <table style="border-collapse: collapse; width: 100%;">
        {"".join(f'<tr><td style="padding: 8px; border: 1px solid #E5E7EB;">{k}</td><td style="padding: 8px; border: 1px solid #E5E7EB;">{v}</td></tr>' for k, v in metrics.items())}
      </table>
      <a href="{settings.FRONTEND_URL}/models" style="display:inline-block; margin-top:16px; background:#4F46E5; color:white; padding:12px 24px; border-radius:8px; text-decoration:none;">View Model</a>
    </div>
    """
    await _send_email(to, f"Model '{model_name}' Training Complete", html)

async def send_password_reset_email(to: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to choose a new password:</p>
      <a href="{reset_url}" style="
        display: inline-block;
        background: #4F46E5;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
      ">Reset Password</a>
      <p style="color: #6B7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
    </div>
    """
    await _send_email(to, "Reset your Parametrix AI password", html)
