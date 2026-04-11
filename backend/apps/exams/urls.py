from django.urls import path

from apps.exams.views import (
    AttemptAnswersView,
    EvaluateAnswerView,
    ExamAttemptsView,
    ExamQuestionListView,
    PublishExamView,
    PublishResultsView,
    QuestionCreateView,
    QuestionDetailView,
    StudentsPerformanceView,
    TeacherCoursesView,
    TeacherDepartmentsView,
    TeacherExamDetailView,
    TeacherExamListCreateView,
    TeacherProfilePhotoView,
    TeacherProfileView,
)

urlpatterns = [
    path("departments/", TeacherDepartmentsView.as_view()),
    path("courses/", TeacherCoursesView.as_view()),
    path("profile/", TeacherProfileView.as_view()),
    path("profile/photo/", TeacherProfilePhotoView.as_view()),
    path("exams/", TeacherExamListCreateView.as_view()),
    path("exams/<uuid:exam_id>/", TeacherExamDetailView.as_view()),
    path("exams/<uuid:exam_id>/publish/", PublishExamView.as_view()),
    path("exams/<uuid:exam_id>/publish-results/", PublishResultsView.as_view()),
    path("exams/<uuid:exam_id>/questions/", ExamQuestionListView.as_view()),
    path("questions/", QuestionCreateView.as_view()),
    path("questions/<uuid:question_id>/", QuestionDetailView.as_view()),
    path("exams/<uuid:exam_id>/attempts/", ExamAttemptsView.as_view()),
    path("attempts/<uuid:attempt_id>/answers/", AttemptAnswersView.as_view()),
    path("answers/<uuid:answer_id>/evaluate/", EvaluateAnswerView.as_view()),
    path("students/performance/", StudentsPerformanceView.as_view()),
]
