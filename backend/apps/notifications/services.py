from rest_framework.exceptions import NotFound

from apps.notifications.models import Notification


def list_notifications(user):
    return Notification.objects.filter(recipient=user).order_by("-created_at")


def mark_read(user, notif_id):
    notif = Notification.objects.filter(id=notif_id, recipient=user).first()
    if not notif:
        raise NotFound("Notification not found.")
    notif.is_read = True
    notif.save(update_fields=["is_read"])
    return notif


def mark_all_read(user):
    updated = Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
    return {"updated": updated}


def unread_count(user):
    return Notification.objects.filter(recipient=user, is_read=False).count()
