from django.urls import path

from apps.results.views import ResultsByExamView

urlpatterns = [
    path("exam/<uuid:exam_id>/", ResultsByExamView.as_view()),
]
