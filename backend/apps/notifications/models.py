import uuid

from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ("exam_assigned", "Exam Assigned"),
        ("result_published", "Result Published"),
        ("password_changed", "Password Changed"),
        ("account_locked", "Account Locked"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    recipient = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notif_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.notif_type} -> {self.recipient.email}"
