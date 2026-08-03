"""Feedback endpoint — same behavior and environment variables as the FS app:

SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_USE_TLS,
FEEDBACK_EMAIL_FROM, FEEDBACK_EMAIL_TO

Copy the values from the FS deployment to reuse the same credentials.
"""

import os
import smtplib
from email.message import EmailMessage
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from .database import get_session
from .models import FeedbackEntry

router = APIRouter(prefix="/api", tags=["feedback"])


def _clean(value) -> str:
    return str(value or "").strip()


def _email_configured() -> bool:
    smtp_host = _clean(os.getenv("SMTP_HOST"))
    smtp_user = _clean(os.getenv("SMTP_USER"))
    feedback_from = _clean(os.getenv("FEEDBACK_EMAIL_FROM"))
    feedback_to = _clean(os.getenv("FEEDBACK_EMAIL_TO"))
    return bool(smtp_host and (feedback_from or smtp_user or feedback_to))


def _send_email(name: str, email: str, message: str, page: str):
    if not _email_configured():
        return "not_configured", None
    feedback_to = _clean(os.getenv("FEEDBACK_EMAIL_TO"))
    if not feedback_to:
        return "not_configured", None
    feedback_from = _clean(os.getenv("FEEDBACK_EMAIL_FROM"))
    smtp_host = _clean(os.getenv("SMTP_HOST"))
    smtp_user = _clean(os.getenv("SMTP_USER"))
    smtp_password = _clean(os.getenv("SMTP_PASSWORD"))
    try:
        smtp_port = int(_clean(os.getenv("SMTP_PORT")) or 587)
    except ValueError:
        smtp_port = 587
    smtp_use_tls = _clean(os.getenv("SMTP_USE_TLS")).lower() in {"1", "true", "yes", "on"}

    msg = EmailMessage()
    msg["Subject"] = f"Feedback ({page or 'app'})"
    msg["From"] = feedback_from or smtp_user or feedback_to
    msg["To"] = feedback_to
    if email:
        msg["Reply-To"] = email
    msg.set_content(
        "\n".join(
            [
                f"Name: {name or 'Anonymous'}",
                f"Email: {email or 'Not provided'}",
                f"Page: {page or 'Unknown'}",
                "",
                message,
            ]
        )
    )
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.ehlo()
            if smtp_use_tls:
                server.starttls()
                server.ehlo()
            if smtp_user:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return "sent", None
    except Exception as exc:
        return "failed", str(exc)


class FeedbackIn(BaseModel):
    name: str = ""
    email: str = ""
    message: str
    page: str = ""
    channel: str = "sidebar_feedback"


@router.post("/feedback")
def create_feedback(payload: FeedbackIn, session: Session = Depends(get_session)):
    message = _clean(payload.message)
    if not message:
        return {"ok": False, "detail": "Message is required"}
    email_status, email_error = _send_email(
        _clean(payload.name), _clean(payload.email), message, _clean(payload.page)
    )
    entry = FeedbackEntry(
        name=_clean(payload.name),
        email=_clean(payload.email),
        message=message,
        page=_clean(payload.page),
        channel=_clean(payload.channel) or "sidebar_feedback",
        email_status=email_status,
    )
    session.add(entry)
    session.commit()
    return {"ok": True, "email_status": email_status, "email_error": email_error}


@router.get("/feedback", response_model=List[FeedbackEntry])
def list_feedback(limit: Optional[int] = 300, session: Session = Depends(get_session)):
    entries = session.exec(select(FeedbackEntry)).all()
    return sorted(entries, key=lambda e: e.id or 0, reverse=True)[: max(1, min(limit or 300, 2000))]
