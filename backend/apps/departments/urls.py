from django.urls import path

from apps.departments.views import (
    CourseDeleteView,
    CourseListCreateView,
    DepartmentDetailView,
    DepartmentListCreateView,
)

urlpatterns = [
    path("departments/", DepartmentListCreateView.as_view()),
    path("departments/<uuid:department_id>/", DepartmentDetailView.as_view()),
    path("courses/", CourseListCreateView.as_view()),
    path("courses/<uuid:course_id>/", CourseDeleteView.as_view()),
]
