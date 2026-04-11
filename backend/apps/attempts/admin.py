from django.contrib import admin

from apps.attempts.models import Answer, Attempt


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = (
        "exam",
        "student",
        "organization",
        "status",
        "violation_count",
        "is_auto_submitted",
        "started_at",
        "submitted_at",
    )
    list_filter = ("status", "is_auto_submitted", "organization", "started_at")
    search_fields = ("exam__title", "student__email", "student__full_name", "organization__name")
    readonly_fields = ("id", "started_at", "submitted_at")


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = (
        "attempt",
        "question",
        "selected_option",
        "is_evaluated",
        "marks_awarded",
        "updated_at",
    )
    list_filter = ("is_evaluated", "question__question_type", "updated_at")
    search_fields = ("attempt__student__email", "attempt__exam__title", "question__question_text")
    readonly_fields = ("id", "updated_at")
