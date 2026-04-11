from rest_framework import serializers

from apps.organizations.models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "email",
            "logo",
            "plan",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]


class OrganizationPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "plan", "is_active"]
