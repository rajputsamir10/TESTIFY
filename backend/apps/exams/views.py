from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.exams import services
from apps.exams.serializers import (
    AttemptSerializer,
    EvaluateAnswerSerializer,
    ExamSerializer,
    TeacherDepartmentSerializer,
    TeacherCourseSerializer,
    TeacherAnswerSerializer,
    TeacherProfileSerializer,
)
from apps.questions.serializers import QuestionSerializer
from utils.permissions import IsTeacher


class TeacherDepartmentsView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        departments = services.list_teacher_departments(request.user)
        return Response(TeacherDepartmentSerializer(departments, many=True).data, status=status.HTTP_200_OK)


class TeacherProfileView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        profile = services.get_teacher_profile(request.user)
        return Response(TeacherProfileSerializer(profile).data, status=status.HTTP_200_OK)


class TeacherProfilePhotoView(APIView):
    permission_classes = [IsTeacher]

    def patch(self, request):
        photo = request.FILES.get("profile_photo")
        if not photo:
            return Response(
                {"detail": "profile_photo file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = services.update_teacher_profile_photo(request.user, photo)
        return Response(TeacherProfileSerializer(profile).data, status=status.HTTP_200_OK)


class TeacherCoursesView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        department_id = request.query_params.get("department_id")
        courses = services.list_teacher_courses(request.user, department_id)
        return Response(TeacherCourseSerializer(courses, many=True).data, status=status.HTTP_200_OK)


class TeacherExamListCreateView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        exams = services.list_exams(request.user)
        return Response(ExamSerializer(exams, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ExamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exam = services.create_exam(request.user, serializer.validated_data)
        return Response(ExamSerializer(exam).data, status=status.HTTP_201_CREATED)


class TeacherExamDetailView(APIView):
    permission_classes = [IsTeacher]

    def put(self, request, exam_id):
        exam = services.update_exam(request.user, exam_id, request.data)
        return Response(ExamSerializer(exam).data, status=status.HTTP_200_OK)

    def delete(self, request, exam_id):
        services.delete_exam(request.user, exam_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublishExamView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request, exam_id):
        exam = services.publish_exam(request.user, exam_id)
        return Response(ExamSerializer(exam).data, status=status.HTTP_200_OK)


class PublishResultsView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request, exam_id):
        result = services.publish_results(request.user, exam_id)
        return Response(result, status=status.HTTP_200_OK)


class ExamQuestionListView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, exam_id):
        questions = services.list_exam_questions(request.user, exam_id)
        return Response(QuestionSerializer(questions, many=True).data, status=status.HTTP_200_OK)


class QuestionCreateView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        serializer = QuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = services.create_question(request.user, serializer.validated_data)
        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class QuestionDetailView(APIView):
    permission_classes = [IsTeacher]

    def put(self, request, question_id):
        serializer = QuestionSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        question = services.update_question(request.user, question_id, serializer.validated_data)
        return Response(QuestionSerializer(question).data, status=status.HTTP_200_OK)

    def delete(self, request, question_id):
        services.delete_question(request.user, question_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExamAttemptsView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, exam_id):
        attempts = services.list_exam_attempts(request.user, exam_id)
        return Response(AttemptSerializer(attempts, many=True).data, status=status.HTTP_200_OK)


class AttemptAnswersView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, attempt_id):
        answers = services.list_attempt_answers(request.user, attempt_id)
        return Response(TeacherAnswerSerializer(answers, many=True).data, status=status.HTTP_200_OK)


class EvaluateAnswerView(APIView):
    permission_classes = [IsTeacher]

    def put(self, request, answer_id):
        serializer = EvaluateAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer = services.evaluate_answer(
            request.user,
            answer_id,
            serializer.validated_data["marks_awarded"],
        )
        return Response(TeacherAnswerSerializer(answer).data, status=status.HTTP_200_OK)


class StudentsPerformanceView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        return Response(list(services.students_performance(request.user)), status=status.HTTP_200_OK)
