from django.contrib import admin

from apps.organizations.models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "email", "plan", "is_active", "created_at")
    list_filter = ("plan", "is_active", "created_at")
    search_fields = ("name", "slug", "email")
    readonly_fields = ("id", "slug", "created_at")
