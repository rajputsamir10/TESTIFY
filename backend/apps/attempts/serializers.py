from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.attempts.models import Answer, Attempt
from apps.exams.models import Exam
from apps.results.models import Result


class StudentProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "full_name",
            "email",
            "role",
            "roll_number",
            "batch_year",
            "department",
            "department_name",
            "course",
            "course_name",
            "profile_photo",
            "organization",
            "created_at",
        ]
        read_only_fields = ["id", "role", "organization", "created_at"]


class AvailableExamSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    question_count = serializers.SerializerMethodField()

    def get_question_count(self, obj):
        return obj.questions.count()

    class Meta:
        model = Exam
        fields = [
            "id",
            "title",
            "description",
            "department_name",
            "course_name",
            "total_marks",
            "question_count",
            "pass_marks",
            "duration_minutes",
            "start_time",
            "end_time",
            "shuffle_questions",
            "allow_review",
        ]


class StudentAttemptSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)

    class Meta:
        model = Attempt
        fields = [
            "id",
            "exam",
            "exam_title",
            "started_at",
            "submitted_at",
            "is_auto_submitted",
            "violation_count",
            "status",
        ]


class StudentAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    question_marks = serializers.DecimalField(source="question.marks", max_digits=6, decimal_places=2, read_only=True)
    problem_statement = serializers.CharField(source="question.problem_statement", read_only=True, allow_null=True)
    input_format = serializers.CharField(source="question.input_format", read_only=True, allow_null=True)
    output_format = serializers.CharField(source="question.output_format", read_only=True, allow_null=True)
    constraints = serializers.CharField(source="question.constraints", read_only=True, allow_null=True)
    sample_test_cases = serializers.JSONField(source="question.sample_test_cases", read_only=True)
    coding_language = serializers.CharField(source="question.coding_language", read_only=True, allow_null=True)
    time_limit_seconds = serializers.IntegerField(source="question.time_limit_seconds", read_only=True)
    memory_limit_mb = serializers.IntegerField(source="question.memory_limit_mb", read_only=True)

    class Meta:
        model = Answer
        fields = [
            "id",
            "attempt",
            "question",
            "question_text",
            "question_type",
            "question_marks",
            "problem_statement",
            "input_format",
            "output_format",
            "constraints",
            "sample_test_cases",
            "coding_language",
            "time_limit_seconds",
            "memory_limit_mb",
            "selected_option",
            "text_answer",
            "code_answer",
            "execution_result",
            "marks_awarded",
            "is_evaluated",
            "updated_at",
        ]
        read_only_fields = ["marks_awarded", "is_evaluated", "updated_at"]


class StudentResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)

    class Meta:
        model = Result
        fields = [
            "id",
            "attempt",
            "exam",
            "exam_title",
            "total_marks",
            "marks_obtained",
            "percentage",
            "is_passed",
            "is_published",
            "published_at",
            "created_at",
        ]
