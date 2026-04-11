import uuid

from django.db import models


class Exam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="exams",
    )
    department = models.ForeignKey(
        "departments.Department",
        on_delete=models.CASCADE,
        related_name="exams",
    )
    course = models.ForeignKey(
        "departments.Course",
        on_delete=models.SET_NULL,
        related_name="exams",
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_exams",
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    pass_marks = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    duration_minutes = models.IntegerField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_published = models.BooleanField(default=False)
    shuffle_questions = models.BooleanField(default=False)
    allow_review = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
