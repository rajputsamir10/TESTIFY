from django.contrib import admin

from apps.notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "recipient",
        "notif_type",
        "organization",
        "is_read",
        "created_at",
    )
    list_filter = ("notif_type", "is_read", "organization", "created_at")
    search_fields = ("recipient__email", "recipient__full_name", "message", "organization__name")
    readonly_fields = ("id", "created_at")
