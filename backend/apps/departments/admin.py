from django.contrib import admin

from apps.departments.models import Course, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "organization", "created_at")
    list_filter = ("organization", "created_at")
    search_fields = ("name", "code", "organization__name")
    readonly_fields = ("id", "created_at")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "department", "organization", "created_at")
    list_filter = ("organization", "department", "created_at")
    search_fields = ("name", "code", "department__name", "organization__name")
    readonly_fields = ("id", "created_at")
