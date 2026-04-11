from django.contrib import admin

from apps.questions.models import MCQOption, Question


class MCQOptionInline(admin.TabularInline):
    model = MCQOption
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "exam",
        "order",
        "question_type",
        "marks",
        "negative_marks",
        "organization",
        "created_at",
    )
    list_filter = ("question_type", "organization", "created_at")
    search_fields = ("question_text", "exam__title", "organization__name")
    readonly_fields = ("id", "created_at")
    inlines = [MCQOptionInline]


@admin.register(MCQOption)
class MCQOptionAdmin(admin.ModelAdmin):
    list_display = ("question", "order", "option_text", "is_correct")
    list_filter = ("is_correct",)
    search_fields = ("option_text", "question__question_text", "question__exam__title")
    readonly_fields = ("id",)
