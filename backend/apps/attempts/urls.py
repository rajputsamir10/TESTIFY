from django.urls import path

from apps.attempts.views import (
    AttemptAnswersView,
    AutoSubmitAttemptView,
    AvailableExamsView,
    RemainingTimeView,
    RunCodingAnswerView,
    StartExamView,
    StudentProfilePhotoView,
    StudentProfileView,
    StudentQuestionOptionsView,
    StudentResultDetailView,
    StudentResultDownloadView,
    StudentResultReviewView,
    StudentResultsView,
    SubmitAttemptView,
    UpdateAnswerView,
    ViolationView,
)

urlpatterns = [
    path("profile/", StudentProfileView.as_view()),
    path("profile/photo/", StudentProfilePhotoView.as_view()),
    path("exams/available/", AvailableExamsView.as_view()),
    path("exams/<uuid:exam_id>/start/", StartExamView.as_view()),
    path("attempts/<uuid:attempt_id>/remaining-time/", RemainingTimeView.as_view()),
    path("attempts/<uuid:attempt_id>/answers/", AttemptAnswersView.as_view()),
    path("questions/<uuid:question_id>/options/", StudentQuestionOptionsView.as_view()),
    path("answers/<uuid:answer_id>/", UpdateAnswerView.as_view()),
    path("answers/<uuid:answer_id>/run-code/", RunCodingAnswerView.as_view()),
    path("attempts/<uuid:attempt_id>/submit/", SubmitAttemptView.as_view()),
    path("attempts/<uuid:attempt_id>/auto-submit/", AutoSubmitAttemptView.as_view()),
    path("attempts/<uuid:attempt_id>/violation/", ViolationView.as_view()),
    path("results/", StudentResultsView.as_view()),
    path("results/<uuid:result_id>/", StudentResultDetailView.as_view()),
    path("results/<uuid:result_id>/review/", StudentResultReviewView.as_view()),
    path("results/<uuid:result_id>/download/", StudentResultDownloadView.as_view()),
]
