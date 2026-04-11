from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import CustomUser, OTPCode


class UserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

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
            "department_name",
            "course",
            "course_name",
            "roll_number",
            "teacher_id",
            "batch_year",
            "profile_photo",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "organization"]


class AdminSignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    organization_name = serializers.CharField(max_length=200)
    organization_email = serializers.EmailField()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs


class AdminSignupOTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class AdminSignupOTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TeacherLoginSerializer(serializers.Serializer):
    teacher_id = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True)


class StudentLoginSerializer(serializers.Serializer):
    roll_number = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True)


class GodLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    identifier = serializers.CharField(required=False, allow_blank=False)
    role = serializers.ChoiceField(
        choices=["god", "admin", "teacher", "student"],
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        identifier = attrs.get("identifier")
        email = attrs.get("email")

        resolved = identifier or email
        if not resolved:
            raise serializers.ValidationError(
                {"identifier": "Provide email or identifier (teacher_id/roll_number)."}
            )

        attrs["identifier"] = resolved
        return attrs


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)
    role = serializers.ChoiceField(
        choices=["god", "admin", "teacher", "student"],
        required=False,
        allow_null=True,
    )


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)
    new_password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["god", "admin", "teacher", "student"],
        required=False,
        allow_null=True,
    )

    def validate_new_password(self, value):
        validate_password(value)
        return value


class AdminUserCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=["teacher", "student", "admin"])
    department_id = serializers.UUIDField(required=False, allow_null=True)
    course_id = serializers.UUIDField(required=False, allow_null=True)
    batch_year = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    roll_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    teacher_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        role = attrs.get("role")
        validate_password(attrs["password"])

        if role == "teacher" and not attrs.get("teacher_id"):
            raise serializers.ValidationError({"teacher_id": "teacher_id is required for teacher."})

        if role == "student" and not attrs.get("roll_number"):
            raise serializers.ValidationError({"roll_number": "roll_number is required for student."})

        if role in ["teacher", "student"] and not attrs.get("department_id"):
            raise serializers.ValidationError({"department_id": "department_id is required."})

        return attrs


class OTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPCode
        fields = ["id", "user", "code", "expires_at", "attempts", "is_used", "created_at"]
