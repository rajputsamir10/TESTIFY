from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.questions import services
from apps.questions.serializers import MCQOptionSerializer, QuestionSerializer


class QuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, question_id):
        question = services.get_question(request.user, question_id)
        return Response(QuestionSerializer(question).data, status=status.HTTP_200_OK)


class QuestionOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, question_id):
        options = services.list_question_options(request.user, question_id)
        return Response(MCQOptionSerializer(options, many=True).data, status=status.HTTP_200_OK)
