from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "organization",
            "recipient",
            "notif_type",
            "message",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "organization", "recipient", "notif_type", "message", "created_at"]
