from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.organizations.models import Organization


class GodOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "email", "logo", "plan", "is_active", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]


class GodUserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "full_name",
            "email",
            "role",
            "organization",
            "organization_name",
            "department",
            "course",
            "roll_number",
            "teacher_id",
            "batch_year",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class GodUserCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=["god", "admin", "teacher", "student"])
    organization_id = serializers.UUIDField(required=False, allow_null=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    course_id = serializers.UUIDField(required=False, allow_null=True)
    roll_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    teacher_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    batch_year = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        role = attrs["role"]

        if role != "god" and not attrs.get("organization_id"):
            raise serializers.ValidationError(
                {"organization_id": "organization_id is required for non-god users."}
            )

        if role == "teacher":
            if not attrs.get("teacher_id"):
                raise serializers.ValidationError({"teacher_id": "teacher_id is required for teacher."})
            if not attrs.get("department_id"):
                raise serializers.ValidationError({"department_id": "department_id is required for teacher."})

        if role == "student":
            if not attrs.get("roll_number"):
                raise serializers.ValidationError({"roll_number": "roll_number is required for student."})
            if not attrs.get("department_id"):
                raise serializers.ValidationError({"department_id": "department_id is required for student."})

        return attrs
