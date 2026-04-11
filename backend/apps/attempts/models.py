import uuid

from django.db import models


class Attempt(models.Model):
    STATUS_CHOICES = [("in_progress", "In Progress"), ("submitted", "Submitted")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    student = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_auto_submitted = models.BooleanField(default=False)
    violation_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="in_progress")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["exam", "student"], name="uniq_exam_student_attempt")
        ]
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.student.full_name} - {self.exam.title} ({self.status})"


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey("questions.Question", on_delete=models.CASCADE)
    selected_option = models.ForeignKey(
        "questions.MCQOption",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    text_answer = models.TextField(blank=True, null=True)
    code_answer = models.TextField(blank=True, null=True)
    execution_result = models.JSONField(blank=True, default=dict)
    marks_awarded = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_evaluated = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="uniq_answer_attempt_question")
        ]
        ordering = ["question__order"]

    def __str__(self) -> str:
        return f"Answer: {self.attempt.student.full_name} - {self.question.id}"
