from rest_framework import serializers

from apps.departments.models import Course, Department


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "organization", "name", "code", "created_at"]
        read_only_fields = ["id", "organization", "created_at"]


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "organization",
            "department",
            "department_name",
            "name",
            "code",
            "created_at",
        ]
        read_only_fields = ["id", "organization", "created_at"]
