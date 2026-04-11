from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations import services
from apps.organizations.serializers import OrganizationSerializer


class AdminOrganizationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = services.get_organization_for_admin(request.user)
        return Response(OrganizationSerializer(org).data, status=status.HTTP_200_OK)

    def put(self, request):
        org = services.update_organization_for_admin(request.user, request.data)
        return Response(OrganizationSerializer(org).data, status=status.HTTP_200_OK)


class AdminOrganizationStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(services.get_organization_stats(request.user), status=status.HTTP_200_OK)


class AdminOrganizationPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(services.get_organization_plan(request.user), status=status.HTTP_200_OK)
