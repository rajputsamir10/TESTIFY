from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import CustomUser, OTPCode

admin.site.site_header = "Testify Administration"
admin.site.site_title = "Testify Admin"
admin.site.index_title = "Platform Management"


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    ordering = ("-created_at",)
    list_display = (
        "email",
        "full_name",
        "role",
        "organization",
        "department",
        "is_active",
        "is_staff",
        "is_superuser",
        "created_at",
    )
    list_filter = (
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "organization",
        "department",
    )
    search_fields = ("email", "full_name", "roll_number", "teacher_id")
    readonly_fields = ("id", "created_at", "last_login", "failed_login_count", "locked_until")

    fieldsets = (
        ("Identity", {"fields": ("id", "full_name", "email", "password", "role")}),
        (
            "Organization",
            {
                "fields": (
                    "organization",
                    "department",
                    "course",
                    "batch_year",
                    "roll_number",
                    "teacher_id",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Security", {"fields": ("failed_login_count", "locked_until", "last_login")}),
        ("Media", {"fields": ("profile_photo",)}),
        ("Important dates", {"fields": ("created_at",)}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "role",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_superuser",
                    "is_active",
                ),
            },
        ),
    )


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at", "attempts", "is_used")
    list_filter = ("is_used", "created_at", "expires_at")
    search_fields = ("user__email", "user__full_name")
    readonly_fields = ("id", "created_at", "code")
