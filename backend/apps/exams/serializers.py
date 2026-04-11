from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.attempts.models import Answer, Attempt
from apps.departments.models import Course, Department
from apps.exams.models import Exam


class ExamSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "organization",
            "department",
            "department_name",
            "course",
            "course_name",
            "created_by",
            "created_by_name",
            "title",
            "description",
            "total_marks",
            "pass_marks",
            "duration_minutes",
            "start_time",
            "end_time",
            "is_published",
            "shuffle_questions",
            "allow_review",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "created_by",
            "total_marks",
            "is_published",
            "created_at",
            "updated_at",
        ]


class AttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Attempt
        fields = [
            "id",
            "exam",
            "student",
            "student_name",
            "started_at",
            "submitted_at",
            "is_auto_submitted",
            "violation_count",
            "status",
        ]


class TeacherAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    coding_language = serializers.CharField(source="question.coding_language", read_only=True, allow_null=True)
    max_marks = serializers.DecimalField(source="question.marks", max_digits=6, decimal_places=2, read_only=True)

    class Meta:
        model = Answer
        fields = [
            "id",
            "attempt",
            "question",
            "question_text",
            "question_type",
            "coding_language",
            "selected_option",
            "text_answer",
            "code_answer",
            "execution_result",
            "marks_awarded",
            "max_marks",
            "is_evaluated",
            "updated_at",
        ]


class EvaluateAnswerSerializer(serializers.Serializer):
    marks_awarded = serializers.DecimalField(max_digits=6, decimal_places=2)


class TeacherProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "full_name",
            "email",
            "teacher_id",
            "department",
            "department_name",
            "profile_photo",
        ]
        read_only_fields = ["id", "email", "teacher_id", "department", "department_name"]


class TeacherDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "code"]


class TeacherCourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Course
        fields = ["id", "department", "department_name", "name", "code"]
