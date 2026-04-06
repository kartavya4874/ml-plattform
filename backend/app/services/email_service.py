"""Email service — async SMTP with Jinja2 templates."""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import structlog

log = structlog.get_logger()


async def _send_email(to: str, subject: str, html: str) -> None:
    if not settings.SMTP_USER:
        log.info("email.skipped", reason="SMTP not configured", to=to, subject=subject)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            start_tls=True,
        )
        log.info("email.sent", to=to, subject=subject)
    except Exception as exc:
        log.error("email.failed", error=str(exc), to=to)


async def send_verification_email(to: str, token: str) -> None:
    verify_url = f"http://localhost:3000/verify/{token}"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Welcome to NoCode AI Platform!</h2>
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
    await _send_email(to, "Verify your NoCode AI email", html)


async def send_training_complete_email(to: str, model_name: str, metrics: dict) -> None:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">🎉 Training Complete!</h2>
      <p>Your model <strong>{model_name}</strong> has finished training.</p>
      <table style="border-collapse: collapse; width: 100%;">
        {"".join(f'<tr><td style="padding: 8px; border: 1px solid #E5E7EB;">{k}</td><td style="padding: 8px; border: 1px solid #E5E7EB;">{v}</td></tr>' for k, v in metrics.items())}
      </table>
      <a href="http://localhost:3000/models" style="display:inline-block; margin-top:16px; background:#4F46E5; color:white; padding:12px 24px; border-radius:8px; text-decoration:none;">View Model</a>
    </div>
    """
    await _send_email(to, f"Model '{model_name}' Training Complete", html)
