from django.contrib import admin

from apps.exams.models import Exam


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "organization",
        "department",
        "created_by",
        "total_marks",
        "pass_marks",
        "is_published",
        "created_at",
    )
    list_filter = ("organization", "department", "is_published", "created_at")
    search_fields = ("title", "description", "organization__name", "department__name")
    readonly_fields = ("id", "total_marks", "created_at", "updated_at")
