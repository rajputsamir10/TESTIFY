from django.urls import path

from apps.questions.views import QuestionDetailView, QuestionOptionsView

urlpatterns = [
    path("<uuid:question_id>/", QuestionDetailView.as_view()),
    path("<uuid:question_id>/options/", QuestionOptionsView.as_view()),
]
