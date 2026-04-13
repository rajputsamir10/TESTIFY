from django.conf import settings
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.attempts import services
from apps.attempts.serializers import (
    AvailableExamSerializer,
    PlaygroundGenerateRequestSerializer,
    PlaygroundQuestionSerializer,
    PlaygroundSessionSerializer,
    PlaygroundSubmitRequestSerializer,
    StudentAnswerSerializer,
    StudentAttemptSerializer,
    StudentProfileSerializer,
    StudentResultSerializer,
)
from apps.questions.serializers import MCQOptionSerializer
from utils.permissions import IsStudent, SameOrganization


class StudentProfileView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        profile = services.get_profile(request.user)
        return Response(StudentProfileSerializer(profile).data, status=status.HTTP_200_OK)


class StudentProfilePhotoView(APIView):
    permission_classes = [IsStudent]

    def patch(self, request):
        photo = request.FILES.get("profile_photo")
        if not photo:
            return Response(
                {"detail": "profile_photo file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = services.update_profile_photo(request.user, photo)
        return Response(StudentProfileSerializer(profile).data, status=status.HTTP_200_OK)


class AvailableExamsView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        exams = services.list_available_exams(request.user)
        return Response(AvailableExamSerializer(exams, many=True).data, status=status.HTTP_200_OK)


class StartExamView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, exam_id):
        attempt = services.start_exam(request.user, exam_id)
        return Response(StudentAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class RemainingTimeView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id):
        remaining_seconds = services.get_remaining_seconds(request.user, attempt_id)
        return Response({"remaining_seconds": remaining_seconds}, status=status.HTTP_200_OK)


class AttemptAnswersView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id):
        answers = services.get_attempt_answers(request.user, attempt_id)
        return Response(StudentAnswerSerializer(answers, many=True).data, status=status.HTTP_200_OK)


class StudentQuestionOptionsView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, question_id):
        options = services.list_question_options_for_student(request.user, question_id)
        return Response(MCQOptionSerializer(options, many=True).data, status=status.HTTP_200_OK)


class UpdateAnswerView(APIView):
    permission_classes = [IsStudent]

    def put(self, request, answer_id):
        answer = services.update_answer(request.user, answer_id, request.data)
        return Response(StudentAnswerSerializer(answer).data, status=status.HTTP_200_OK)


class RunCodingAnswerView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, answer_id):
        result = services.run_coding_answer(request.user, answer_id, request.data)
        return Response(result, status=status.HTTP_200_OK)


class SubmitAttemptView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_id):
        attempt = services.submit_attempt(request.user, attempt_id, auto=False)
        return Response(StudentAttemptSerializer(attempt).data, status=status.HTTP_200_OK)


class AutoSubmitAttemptView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_id):
        attempt = services.auto_submit_attempt(request.user, attempt_id)
        return Response(StudentAttemptSerializer(attempt).data, status=status.HTTP_200_OK)


class ViolationView(APIView):
    permission_classes = [IsStudent, SameOrganization]

    def post(self, request, attempt_id):
        attempt = services.get_attempt_for_student(request.user, attempt_id)
        self.check_object_permissions(request, attempt)
        result = services.record_violation(request.user, attempt_id, attempt=attempt)
        return Response(result, status=status.HTTP_200_OK)


class StudentResultsView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        results = services.list_results(request.user)
        return Response(StudentResultSerializer(results, many=True).data, status=status.HTTP_200_OK)


class StudentResultDetailView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, result_id):
        result = services.get_result(request.user, result_id)
        return Response(StudentResultSerializer(result).data, status=status.HTTP_200_OK)


class StudentResultReviewView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, result_id):
        result, answers = services.get_result_review(request.user, result_id)
        return Response(
            {
                "result": StudentResultSerializer(result).data,
                "answers": StudentAnswerSerializer(answers, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class StudentResultDownloadView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, result_id):
        fmt = request.query_params.get("format")
        if not fmt:
            return Response({"detail": "format query param is required."}, status=status.HTTP_400_BAD_REQUEST)
        return services.download_result(request.user, result_id, fmt)


class PlaygroundGenerateView(APIView):
    permission_classes = [IsStudent]

    @method_decorator(
        ratelimit(
            key="ip",
            rate=settings.PLAYGROUND_IP_RATE_LIMIT,
            method="POST",
            block=True,
        )
    )
    @method_decorator(
        ratelimit(
            key="user_or_ip",
            rate=settings.PLAYGROUND_STUDENT_RATE_LIMIT,
            method="POST",
            block=True,
        )
    )
    def post(self, request):
        serializer = PlaygroundGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = services.generate_playground_session(
            request.user,
            topic=serializer.validated_data["topic"],
            difficulty=serializer.validated_data["difficulty"],
            question_count=serializer.validated_data["question_count"],
        )
        _, questions, answer_map = services.get_playground_questions_with_answers(
            request.user,
            session.id,
        )

        return Response(
            {
                "session": PlaygroundSessionSerializer(session).data,
                "questions": PlaygroundQuestionSerializer(
                    questions,
                    many=True,
                    context={
                        "answer_map": answer_map,
                        "include_solutions": False,
                    },
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PlaygroundSessionListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        sessions = services.list_playground_sessions(request.user)
        return Response(PlaygroundSessionSerializer(sessions, many=True).data, status=status.HTTP_200_OK)


class PlaygroundSessionDetailView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, session_id):
        session, questions, answer_map = services.get_playground_questions_with_answers(
            request.user,
            session_id,
        )
        include_solutions = session.status == "submitted"

        return Response(
            {
                "session": PlaygroundSessionSerializer(session).data,
                "questions": PlaygroundQuestionSerializer(
                    questions,
                    many=True,
                    context={
                        "answer_map": answer_map,
                        "include_solutions": include_solutions,
                    },
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class PlaygroundSubmitView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, session_id):
        serializer = PlaygroundSubmitRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = services.submit_playground_session(
            request.user,
            session_id,
            serializer.validated_data["answers"],
        )
        _, questions, answer_map = services.get_playground_questions_with_answers(
            request.user,
            session.id,
        )

        return Response(
            {
                "session": PlaygroundSessionSerializer(session).data,
                "questions": PlaygroundQuestionSerializer(
                    questions,
                    many=True,
                    context={
                        "answer_map": answer_map,
                        "include_solutions": True,
                    },
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class PlaygroundSummaryView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        return Response(services.get_playground_summary(request.user), status=status.HTTP_200_OK)
