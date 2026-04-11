from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.god import services
from apps.god.serializers import (
    GodOrganizationSerializer,
    GodUserCreateSerializer,
    GodUserSerializer,
)
from utils.permissions import IsGod


class GodBaseAPIView(APIView):
    permission_classes = [IsGod]

    @staticmethod
    def _forbid_non_god(request):
        if request.user.role != "god":
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return None


class GodStatsView(GodBaseAPIView):

    def get(self, request):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        return Response(services.get_platform_stats(request.user), status=status.HTTP_200_OK)


class GodOrganizationListCreateView(GodBaseAPIView):

    def get(self, request):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        orgs = services.list_organizations(request.user)
        return Response(GodOrganizationSerializer(orgs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        serializer = GodOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = services.create_organization(request.user, serializer.validated_data)
        return Response(GodOrganizationSerializer(org).data, status=status.HTTP_201_CREATED)


class GodOrganizationDetailView(GodBaseAPIView):

    def get(self, request, org_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        org = services.get_organization(request.user, org_id)
        return Response(GodOrganizationSerializer(org).data, status=status.HTTP_200_OK)

    def put(self, request, org_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        org = services.update_organization(request.user, org_id, request.data)
        return Response(GodOrganizationSerializer(org).data, status=status.HTTP_200_OK)

    def delete(self, request, org_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        services.delete_organization(request.user, org_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GodOrganizationPlanPatchView(GodBaseAPIView):

    def patch(self, request, org_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        plan = request.data.get("plan")
        if not plan:
            return Response({"detail": "plan is required."}, status=status.HTTP_400_BAD_REQUEST)
        org = services.patch_organization_plan(request.user, org_id, plan)
        return Response(GodOrganizationSerializer(org).data, status=status.HTTP_200_OK)


class GodOrganizationSuspendPatchView(GodBaseAPIView):

    def patch(self, request, org_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        is_active = request.data.get("is_active")
        if is_active is None:
            return Response({"detail": "is_active is required."}, status=status.HTTP_400_BAD_REQUEST)
        org = services.patch_organization_suspend(request.user, org_id, bool(is_active))
        return Response(GodOrganizationSerializer(org).data, status=status.HTTP_200_OK)


class GodUserListCreateView(GodBaseAPIView):

    def get(self, request):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        users = services.list_users(request.user)
        return Response(GodUserSerializer(users, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        serializer = GodUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.create_user(request.user, serializer.validated_data)
        return Response(GodUserSerializer(user).data, status=status.HTTP_201_CREATED)


class GodUserDetailView(GodBaseAPIView):

    def get(self, request, user_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        user = services.get_user(request.user, user_id)
        return Response(GodUserSerializer(user).data, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        user = services.update_user(request.user, user_id, request.data)
        return Response(GodUserSerializer(user).data, status=status.HTTP_200_OK)

    def delete(self, request, user_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        services.delete_user(request.user, user_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GodUserResetPasswordView(GodBaseAPIView):

    def patch(self, request, user_id):
        forbidden = self._forbid_non_god(request)
        if forbidden:
            return forbidden
        new_password = request.data.get("new_password")
        if not new_password:
            return Response({"detail": "new_password is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = services.reset_user_password(request.user, user_id, new_password)
        return Response({"detail": f"Password reset for {user.email}."}, status=status.HTTP_200_OK)
