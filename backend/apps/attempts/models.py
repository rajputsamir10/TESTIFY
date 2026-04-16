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


class PlaygroundSession(models.Model):
    STATUS_CHOICES = [
        ("generated", "Generated"),
        ("submitted", "Submitted"),
    ]
    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    student = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="playground_sessions",
    )
    department = models.ForeignKey(
        "departments.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="playground_sessions",
    )
    course = models.ForeignKey(
        "departments.Course",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="playground_sessions",
    )
    topic = models.CharField(max_length=200)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default="medium")
    requested_question_count = models.PositiveSmallIntegerField(default=5)
    generated_question_count = models.PositiveSmallIntegerField(default=0)
    correct_answers = models.PositiveSmallIntegerField(default=0)
    score_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="generated")
    generator_model = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Playground {self.student.full_name} - {self.topic} ({self.status})"


class PlaygroundQuestion(models.Model):
    QUESTION_TYPE_CHOICES = [
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
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        PlaygroundSession,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default="mcq")
    question_text = models.TextField()
    options = models.JSONField(default=list)
    correct_option_index = models.PositiveSmallIntegerField(null=True, blank=True)
    expected_answer = models.TextField(blank=True, default="")
    coding_language = models.CharField(
        max_length=20,
        choices=CODING_LANGUAGE_CHOICES,
        blank=True,
        default="",
    )
    problem_statement = models.TextField(blank=True, default="")
    input_format = models.TextField(blank=True, default="")
    output_format = models.TextField(blank=True, default="")
    constraints = models.TextField(blank=True, default="")
    sample_test_cases = models.JSONField(blank=True, default=list)
    hidden_test_cases = models.JSONField(blank=True, default=list)
    explanation = models.TextField(blank=True, default="")
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "order"],
                name="uniq_playground_question_session_order",
            )
        ]

    def __str__(self) -> str:
        return f"PlaygroundQuestion {self.session_id} #{self.order}"


class PlaygroundAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        PlaygroundSession,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        PlaygroundQuestion,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    selected_option_index = models.PositiveSmallIntegerField(null=True, blank=True)
    text_answer = models.TextField(blank=True, default="")
    code_answer = models.TextField(blank=True, default="")
    execution_result = models.JSONField(blank=True, default=dict)
    is_correct = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "question"],
                name="uniq_playground_answer_session_question",
            )
        ]

    def __str__(self) -> str:
        return f"PlaygroundAnswer {self.session_id} - {self.question_id}"
