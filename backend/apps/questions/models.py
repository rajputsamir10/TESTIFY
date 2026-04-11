import uuid

from django.db import models


class Question(models.Model):
    TYPE_CHOICES = [
        ("mcq", "MCQ"),
        ("subjective", "Subjective"),
        ("coding", "Coding"),
        ("dsa", "DSA Problem"),
    ]
    CODING_LANGUAGE_CHOICES = [
        ("python", "Python"),
        ("javascript", "JavaScript"),
        ("java", "Java"),
        ("c", "C"),
        ("cpp", "C++"),
        ("html", "HTML/CSS"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="questions",
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="mcq")
    problem_statement = models.TextField(blank=True, null=True)
    input_format = models.TextField(blank=True, null=True)
    output_format = models.TextField(blank=True, null=True)
    constraints = models.TextField(blank=True, null=True)
    sample_test_cases = models.JSONField(blank=True, default=list)
    hidden_test_cases = models.JSONField(blank=True, default=list)
    time_limit_seconds = models.IntegerField(default=3)
    memory_limit_mb = models.IntegerField(default=256)
    coding_language = models.CharField(
        max_length=20,
        choices=CODING_LANGUAGE_CHOICES,
        null=True,
        blank=True,
    )
    marks = models.DecimalField(max_digits=6, decimal_places=2)
    negative_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    image = models.ImageField(upload_to="question_images/", null=True, blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return f"{self.exam.title}: Q{self.order}"


class MCQOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options",
    )
    option_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"Option {self.order} ({'correct' if self.is_correct else 'wrong'})"
