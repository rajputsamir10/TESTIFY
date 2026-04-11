import uuid

from django.db import models


class Result(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    attempt = models.OneToOneField(
        "attempts.Attempt",
        on_delete=models.CASCADE,
        related_name="result",
    )
    student = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="results",
    )
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="results",
    )
    total_marks = models.DecimalField(max_digits=8, decimal_places=2)
    marks_obtained = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_passed = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    evaluated_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluated_results",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Result: {self.student.full_name} - {self.exam.title}"
