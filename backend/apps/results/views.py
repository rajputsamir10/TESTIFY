from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.results.serializers import ResultSerializer
from apps.results.services import list_results_for_exam


class ResultsByExamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, exam_id):
        results = list_results_for_exam(exam_id)
        return Response(ResultSerializer(results, many=True).data, status=status.HTTP_200_OK)
