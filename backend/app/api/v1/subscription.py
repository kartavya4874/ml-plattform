"""Subscription routes — /api/v1/subscription/"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response

from app.models.models import User, SubscriptionTier, SubscriptionStatus, Invoice
from app.schemas.schemas import (
    SubscriptionOut, UsageOut, PricingTierInfo, SubscriptionSummary, TierLimitInfo, InvoiceOut
)
from app.api.v1.auth import get_current_user
from app.services.quota_service import (
    get_or_create_subscription, get_or_create_usage,
    get_usage_summary, get_user_tier, get_tier_limits,
    PRICING_INFO,
)

router = APIRouter(prefix="/subscription", tags=["Subscription & Billing"])


@router.get("/pricing", response_model=list[PricingTierInfo])
async def get_pricing():
    """Public endpoint — return all pricing tiers and their features."""
    return PRICING_INFO


@router.get("", response_model=SubscriptionSummary)
async def get_subscription(
    current_user: User = Depends(get_current_user),
):
    """Get current user's subscription, usage, and limits."""
    sub = await get_or_create_subscription(current_user.id)
    usage_record = await get_or_create_usage(current_user.id)
    tier = await get_user_tier(current_user.id)
    limits = get_tier_limits(tier)

    return SubscriptionSummary(
        subscription=sub,
        usage=UsageOut(
            datasets_created=usage_record.datasets_created,
            training_jobs_run=usage_record.training_jobs_run,
            models_created=usage_record.models_created,
            deployments_active=usage_record.deployments_active,
            inference_requests=usage_record.inference_requests,
            storage_bytes_used=usage_record.storage_bytes_used,
        ),
        limits=TierLimitInfo(
            datasets=limits["datasets"],
            max_file_size_mb=limits["max_file_size_bytes"] // (1024 * 1024),
            training_jobs_per_month=limits["training_jobs_per_month"],
            models=limits["models"],
            deployments=limits["deployments"],
            inference_requests_per_month=limits["inference_requests_per_month"],
            api_keys_per_model=limits["api_keys_per_model"],
        ),
        tier=tier.value,
    )


@router.get("/usage")
async def get_usage(
    current_user: User = Depends(get_current_user),
):
    """Get detailed usage breakdown for the current billing period."""
    return await get_usage_summary(current_user.id)


@router.post("/upgrade/{tier}")
async def upgrade_subscription(
    tier: str,
    current_user: User = Depends(get_current_user),
):
    """
    Upgrade subscription tier.
    
    NOTE: Payment gateway not yet integrated. This endpoint currently
    upgrades the tier directly. In production, this would create a 
    Stripe checkout session and the upgrade would happen via webhook.
    """
    try:
        new_tier = SubscriptionTier(tier)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}. Must be one of: free, pro, enterprise")

    sub = await get_or_create_subscription(current_user.id)
    
    # Check ordering: free < pro < enterprise
    tier_order = {SubscriptionTier.free: 0, SubscriptionTier.pro: 1, SubscriptionTier.enterprise: 2}
    if tier_order.get(new_tier, 0) <= tier_order.get(sub.tier, 0):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upgrade from {sub.tier.value} to {new_tier.value}. "
                   f"Please choose a higher tier or contact support to downgrade.",
        )

    sub.tier = new_tier
    sub.status = SubscriptionStatus.active
    # Note: stripe_customer_id and stripe_subscription_id would be set here
    # after Stripe checkout completes via webhook
    from datetime import datetime, timezone
    sub.updated_at = datetime.now(timezone.utc)
    await sub.save()

    # Also update the user role to match
    if new_tier == SubscriptionTier.pro:
        current_user.role = "pro"
    elif new_tier == SubscriptionTier.enterprise:
        current_user.role = "admin"
    await current_user.save()

    return {
        "message": f"Successfully upgraded to {new_tier.value.capitalize()} plan!",
        "tier": new_tier.value,
        "note": "Payment gateway not yet configured. This upgrade was applied directly.",
    }


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
):
    """
    Cancel subscription at end of current billing period.
    
    NOTE: In production this would also cancel the Stripe subscription.
    """
    sub = await get_or_create_subscription(current_user.id)
    
    if sub.tier == SubscriptionTier.free:
        raise HTTPException(status_code=400, detail="Cannot cancel a free plan")

    sub.cancel_at_period_end = True
    from datetime import datetime, timezone
    sub.updated_at = datetime.now(timezone.utc)
    await sub.save()

    return {
        "message": "Subscription will be cancelled at the end of the current billing period.",
        "current_period_end": sub.current_period_end,
    }


@router.get("/invoices", response_model=list[InvoiceOut])
async def get_invoices(
    current_user: User = Depends(get_current_user),
):
    """Get billing history and invoices."""
    invoices = await Invoice.find(Invoice.user_id == current_user.id).sort(-Invoice.created_at).to_list()
    # Generate mock invoice if missing and user is not free plan
    sub = await get_or_create_subscription(current_user.id)
    if not invoices and sub.tier != SubscriptionTier.free:
        mock_inv = Invoice(
            user_id=current_user.id,
            subscription_id=sub.id,
            amount_due=49.0 if sub.tier == SubscriptionTier.pro else 199.0,
            amount_paid=49.0 if sub.tier == SubscriptionTier.pro else 199.0,
            status="paid",
            billing_reason="subscription_cycle"
        )
        await mock_inv.insert()
        invoices = [mock_inv]
    
    return invoices


@router.get("/invoices/{invoice_id}/download")
async def download_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
):
    """Download a professional PDF invoice."""
    import uuid
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    from reportlab.platypus import Table, TableStyle

    try:
        inv_uuid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice id")

    invoice = await Invoice.get(inv_uuid)
    if not invoice or invoice.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Invoice not found")

    sub = await get_or_create_subscription(current_user.id)

    # ── Build PDF ─────────────────────────────────────────────────
    buf = io.BytesIO()
    w, h = A4  # 595 x 842 pts
    c = canvas.Canvas(buf, pagesize=A4)

    BLACK = HexColor("#0A0A0A")
    DARK  = HexColor("#333333")
    MUTED = HexColor("#777777")
    ACCENT = HexColor("#FAFAFA")
    BG_ROW = HexColor("#F5F5F5")

    # ── Header band ───────────────────────────────────────────────
    c.setFillColor(BLACK)
    c.rect(0, h - 100, w, 100, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(40, h - 55, "Parametrix AI")
    c.setFont("Helvetica", 10)
    c.drawString(40, h - 72, "AI Model Training & Deployment Platform")

    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(w - 40, h - 50, "INVOICE")
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#BBBBBB"))
    c.drawRightString(w - 40, h - 66, f"#{str(invoice.id)[:8].upper()}")

    # ── Invoice meta (left + right columns) ──────────────────────
    y = h - 140
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(40, y, "BILLED TO")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#222222"))
    c.drawString(40, y - 16, current_user.full_name or current_user.email.split("@")[0])
    c.drawString(40, y - 30, current_user.email)

    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(w - 40, y, "INVOICE DETAILS")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#222222"))
    c.drawRightString(w - 40, y - 16, f"Date: {invoice.created_at.strftime('%B %d, %Y')}")
    c.drawRightString(w - 40, y - 30, f"Status: {invoice.status.upper()}")
    c.drawRightString(w - 40, y - 44, f"Plan: {sub.tier.value.upper()}")

    # ── Divider ──────────────────────────────────────────────────
    y -= 70
    c.setStrokeColor(HexColor("#E0E0E0"))
    c.setLineWidth(0.5)
    c.line(40, y, w - 40, y)

    # ── Line‐items table ─────────────────────────────────────────
    tier_name = sub.tier.value.capitalize()
    period_start = sub.current_period_start.strftime("%b %d, %Y") if sub.current_period_start else "—"
    period_end = sub.current_period_end.strftime("%b %d, %Y") if sub.current_period_end else "—"

    table_data = [
        ["Description", "Period", "Qty", "Amount"],
        [f"Parametrix AI {tier_name} Plan", f"{period_start} – {period_end}", "1", f"${invoice.amount_due:.2f}"],
    ]

    col_widths = [220, 160, 50, 85]
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",    (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), ACCENT),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING",    (0, 0), (-1, 0), 10),
        # Data rows
        ("BACKGROUND",    (0, 1), (-1, -1), BG_ROW),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 10),
        ("TOPPADDING",    (0, 1), (-1, -1), 10),
        # Alignment
        ("ALIGN",         (2, 0), (2, -1), "CENTER"),
        ("ALIGN",         (3, 0), (3, -1), "RIGHT"),
        # Grid
        ("LINEBELOW",     (0, 0), (-1, 0), 0.5, HexColor("#444444")),
        ("LINEBELOW",     (0, -1), (-1, -1), 0.5, HexColor("#DDDDDD")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))

    table_y = y - 20
    tw, th = table.wrap(0, 0)
    table.drawOn(c, 40, table_y - th)

    # ── Totals ───────────────────────────────────────────────────
    totals_y = table_y - th - 30
    c.setFont("Helvetica", 10)
    c.setFillColor(MUTED)
    c.drawRightString(w - 130, totals_y, "Subtotal:")
    c.setFillColor(HexColor("#222222"))
    c.drawRightString(w - 40, totals_y, f"${invoice.amount_due:.2f}")

    c.setFillColor(MUTED)
    c.drawRightString(w - 130, totals_y - 18, "Tax (0%):")
    c.setFillColor(HexColor("#222222"))
    c.drawRightString(w - 40, totals_y - 18, "$0.00")

    c.setStrokeColor(HexColor("#CCCCCC"))
    c.line(w - 250, totals_y - 30, w - 40, totals_y - 30)

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(BLACK)
    c.drawRightString(w - 130, totals_y - 50, "Total Paid:")
    c.drawRightString(w - 40, totals_y - 50, f"${invoice.amount_paid:.2f}")

    # ── Payment badge ────────────────────────────────────────────
    badge_y = totals_y - 50
    if invoice.status == "paid":
        c.setFillColor(HexColor("#DCFCE7"))
        c.roundRect(40, badge_y - 8, 70, 22, 4, fill=1, stroke=0)
        c.setFillColor(HexColor("#166534"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(52, badge_y - 1, "✓ PAID")

    # ── Footer ───────────────────────────────────────────────────
    footer_y = 60
    c.setStrokeColor(HexColor("#E0E0E0"))
    c.line(40, footer_y + 20, w - 40, footer_y + 20)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(40, footer_y, "Parametrix AI — AI Model Training & Deployment Platform")
    c.drawString(40, footer_y - 12, "Questions? Contact support@parametrix.in")
    c.drawRightString(w - 40, footer_y, f"Invoice {str(invoice.id)[:8].upper()}")
    c.drawRightString(w - 40, footer_y - 12, "Thank you for your business.")

    c.save()
    pdf_bytes = buf.getvalue()
    buf.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Parametrix_Invoice_{str(invoice.id)[:8].upper()}.pdf"'
        },
    )
