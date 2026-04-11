from django.contrib import admin

from apps.results.models import Result


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = (
        "exam",
        "student",
        "organization",
        "marks_obtained",
        "total_marks",
        "percentage",
        "is_passed",
        "is_published",
        "published_at",
        "created_at",
    )
    list_filter = ("is_passed", "is_published", "organization", "created_at")
    search_fields = ("exam__title", "student__email", "student__full_name", "organization__name")
    readonly_fields = ("id", "created_at", "published_at")
