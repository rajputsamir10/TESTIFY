from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.god.models import (
    GodModeBugReport,
    GodModeFeatureToggle,
    GodModeLog,
    GodModeSetting,
)
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


class GodModeFeatureToggleSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.CharField(source="updated_by.email", read_only=True)

    class Meta:
        model = GodModeFeatureToggle
        fields = [
            "id",
            "key",
            "label",
            "description",
            "is_enabled",
            "updated_by_email",
            "updated_at",
        ]


class GodModeFeatureTogglePatchSerializer(serializers.Serializer):
    is_enabled = serializers.BooleanField()


class GodModeLogSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source="created_by.email", read_only=True)

    class Meta:
        model = GodModeLog
        fields = [
            "id",
            "module",
            "level",
            "message",
            "details",
            "created_by_email",
            "created_at",
        ]


class GodModeLogCreateSerializer(serializers.Serializer):
    module = serializers.CharField(max_length=80)
    level = serializers.ChoiceField(choices=["info", "success", "warning", "error"], required=False, default="info")
    message = serializers.CharField(max_length=500)
    details = serializers.JSONField(required=False)


class GodModeBugReportSerializer(serializers.ModelSerializer):
    assigned_to_email = serializers.CharField(source="assigned_to.email", read_only=True)
    reported_by_email = serializers.CharField(source="reported_by.email", read_only=True)

    class Meta:
        model = GodModeBugReport
        fields = [
            "id",
            "title",
            "module",
            "severity",
            "steps_to_reproduce",
            "screenshot",
            "status",
            "assigned_to",
            "assigned_to_email",
            "reported_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "reported_by_email", "created_at", "updated_at", "assigned_to_email"]


class GodModeBugReportCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=220)
    module = serializers.CharField(max_length=80)
    severity = serializers.ChoiceField(choices=["low", "medium", "high", "critical"], required=False, default="medium")
    steps_to_reproduce = serializers.CharField(max_length=4000)


class GodModeBugReportPatchSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["open", "in_progress", "resolved"], required=False)
    assigned_to = serializers.UUIDField(required=False, allow_null=True)


class GodModeExamSimulationSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["start", "force_timer_end", "force_submit", "simulate_student_answer"],
        required=False,
        default="start",
    )
    duration_minutes = serializers.IntegerField(required=False, min_value=1, max_value=240, default=30)
    question_count = serializers.IntegerField(required=False, min_value=1, max_value=200, default=20)
    subject = serializers.CharField(required=False, max_length=120, default="General")
    mode = serializers.ChoiceField(choices=["mcq", "coding", "mixed"], required=False, default="mixed")


class GodModeAntiCheatSimulationSerializer(serializers.Serializer):
    trigger = serializers.ChoiceField(
        choices=[
            "tab_switch",
            "browser_minimize",
            "fullscreen_exit",
            "camera_off",
            "face_not_detected",
            "multiple_faces",
            "no_person_in_frame",
            "mic_muted",
            "network_disconnect",
            "right_click",
            "copy_attempt",
            "paste_attempt",
            "keyboard_shortcut",
            "devtools_open",
        ]
    )


class GodModeRoleTesterSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["god", "developer", "admin", "teacher", "student", "guest"])


class GodModeApiMonitorRequestSerializer(serializers.Serializer):
    run_full_suite = serializers.BooleanField(required=False, default=True)


class GodModeStressTestSerializer(serializers.Serializer):
    scenario = serializers.ChoiceField(
        choices=[
            "users_10",
            "users_100",
            "requests_1000",
            "concurrent_submissions",
            "result_generation_load",
        ]
    )


class GodModeNotificationSimulationSerializer(serializers.Serializer):
    target_role = serializers.ChoiceField(choices=["god", "admin", "teacher", "student", "all"], required=False, default="all")
    message = serializers.CharField(max_length=300, required=False, allow_blank=True)


class GodModeSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GodModeSetting
        fields = ["id", "key", "value", "updated_at"]


class GodModeSettingsPatchSerializer(serializers.Serializer):
    theme = serializers.ChoiceField(choices=["system", "light", "dark"], required=False)
    auto_refresh_interval = serializers.IntegerField(required=False, min_value=5, max_value=3600)
    log_retention_days = serializers.IntegerField(required=False, min_value=1, max_value=365)
    notification_sound = serializers.BooleanField(required=False)
    safe_mode_reset = serializers.BooleanField(required=False)
