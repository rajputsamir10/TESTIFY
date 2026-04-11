from rest_framework import serializers

from apps.results.models import Result


class ResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Result
        fields = [
            "id",
            "organization",
            "attempt",
            "student",
            "student_name",
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
