import logging

from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_platform_email(recipient_email: str, subject: str, message: str):
    """Best-effort email sender that never interrupts critical product flows."""
    if not recipient_email:
        return

    text_body = str(message or "").strip()
    message_lines = [line.strip() for line in text_body.splitlines() if line.strip()]

    try:
        html_body = render_to_string(
            "emails/platform_notification.html",
            {
                "subject": subject,
                "message_lines": message_lines,
                "year": timezone.now().year,
            },
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=None,
            to=[recipient_email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)
    except Exception as exc:
        logger.warning("HTML email dispatch failed to %s: %s", recipient_email, exc)
        try:
            send_mail(
                subject=subject,
                message=text_body,
                from_email=None,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
        except Exception as fallback_exc:
            logger.warning("Fallback email dispatch failed to %s: %s", recipient_email, fallback_exc)
