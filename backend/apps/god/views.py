from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.god import services
from apps.god.serializers import (
    GodModeAntiCheatSimulationSerializer,
    GodModeApiMonitorRequestSerializer,
    GodModeBugReportCreateSerializer,
    GodModeBugReportPatchSerializer,
    GodModeBugReportSerializer,
    GodModeExamSimulationSerializer,
    GodModeFeatureTogglePatchSerializer,
    GodModeFeatureToggleSerializer,
    GodModeLogCreateSerializer,
    GodModeLogSerializer,
    GodModeNotificationSimulationSerializer,
    GodOrganizationSerializer,
    GodModeRoleTesterSerializer,
    GodModeSettingsPatchSerializer,
    GodModeSettingSerializer,
    GodModeStressTestSerializer,
    GodUserCreateSerializer,
    GodUserSerializer,
)
from utils.permissions import IsGod, IsGodModeAuthorized, IsGodModeFullAccess, get_god_mode_access_mode, is_god_user


class GodBaseAPIView(APIView):
    permission_classes = [IsGod]

    @staticmethod
    def _forbid_non_god(request):
        if not is_god_user(request.user):
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


class GodModeBaseAPIView(APIView):
    permission_classes = [IsGodModeAuthorized]


class GodModeOverviewView(GodModeBaseAPIView):

    def get(self, request):
        payload = services.get_god_mode_overview(request.user)
        access_mode = get_god_mode_access_mode(request.user)
        payload["access"] = {
            "mode": access_mode,
            "can_write": access_mode == "full",
        }
        return Response(payload, status=status.HTTP_200_OK)


class GodModeFullAccessAPIView(APIView):
    permission_classes = [IsGodModeFullAccess]


class GodModeExamSimulationView(GodModeFullAccessAPIView):

    def post(self, request):
        serializer = GodModeExamSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.simulate_exam_action(request.user, serializer.validated_data)
        return Response(result, status=status.HTTP_200_OK)


class GodModeAntiCheatSimulationView(GodModeFullAccessAPIView):

    def post(self, request):
        serializer = GodModeAntiCheatSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.simulate_anti_cheat_trigger(request.user, serializer.validated_data["trigger"])
        return Response(result, status=status.HTTP_200_OK)


class GodModeRoleAccessSimulationView(GodModeBaseAPIView):

    def post(self, request):
        serializer = GodModeRoleTesterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.simulate_role_access_preview(request.user, serializer.validated_data["role"])
        return Response(result, status=status.HTTP_200_OK)


class GodModeApiMonitorView(GodModeBaseAPIView):

    def post(self, request):
        serializer = GodModeApiMonitorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.run_api_monitor(
            request.user,
            run_full_suite=serializer.validated_data.get("run_full_suite", True),
        )
        return Response(result, status=status.HTTP_200_OK)


class GodModeDatabaseInspectorView(GodModeBaseAPIView):

    def get(self, request):
        return Response(services.inspect_database(request.user), status=status.HTTP_200_OK)


class GodModeFeatureToggleListView(GodModeBaseAPIView):

    def get(self, request):
        toggles = services.list_feature_toggles(request.user)
        return Response(GodModeFeatureToggleSerializer(toggles, many=True).data, status=status.HTTP_200_OK)


class GodModeFeatureTogglePatchView(GodModeBaseAPIView):
    permission_classes = [IsGodModeFullAccess]

    def patch(self, request, key):
        serializer = GodModeFeatureTogglePatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        toggle = services.patch_feature_toggle(request.user, key, serializer.validated_data["is_enabled"])
        return Response(GodModeFeatureToggleSerializer(toggle).data, status=status.HTTP_200_OK)


class GodModeLogListCreateView(GodModeBaseAPIView):

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsGodModeFullAccess()]
        return [IsGodModeAuthorized()]

    def get(self, request):
        module = request.query_params.get("module")
        level = request.query_params.get("level")
        limit = request.query_params.get("limit", 200)
        logs = services.list_god_mode_logs(request.user, module=module, level=level, limit=limit)
        return Response(GodModeLogSerializer(logs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = GodModeLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = services.append_god_mode_log(request.user, serializer.validated_data)
        return Response(GodModeLogSerializer(log).data, status=status.HTTP_201_CREATED)


class GodModeLogExportView(GodModeBaseAPIView):

    def get(self, request):
        module = request.query_params.get("module")
        level = request.query_params.get("level")
        limit = request.query_params.get("limit", 1000)
        csv_content = services.export_god_mode_logs_csv(request.user, module=module, level=level, limit=limit)

        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=god_mode_logs.csv"
        return response


class GodModeStressTestView(GodModeFullAccessAPIView):

    def post(self, request):
        serializer = GodModeStressTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.run_stress_test(request.user, serializer.validated_data["scenario"])
        return Response(result, status=status.HTTP_200_OK)


class GodModeBugReportListCreateView(GodModeBaseAPIView):

    def get(self, request):
        bugs = services.list_bug_reports(request.user)
        return Response(GodModeBugReportSerializer(bugs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = GodModeBugReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bug = services.create_bug_report(request.user, serializer.validated_data)
        return Response(GodModeBugReportSerializer(bug).data, status=status.HTTP_201_CREATED)


class GodModeBugReportPatchView(GodModeFullAccessAPIView):

    def patch(self, request, bug_id):
        serializer = GodModeBugReportPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bug = services.patch_bug_report(request.user, bug_id, serializer.validated_data)
        return Response(GodModeBugReportSerializer(bug).data, status=status.HTTP_200_OK)


class GodModeSettingsView(GodModeBaseAPIView):

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsGodModeFullAccess()]
        return [IsGodModeAuthorized()]

    def get(self, request):
        settings_qs = services.list_god_mode_settings(request.user)
        return Response(GodModeSettingSerializer(settings_qs, many=True).data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = GodModeSettingsPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.patch_god_mode_settings(request.user, serializer.validated_data)
        return Response(result, status=status.HTTP_200_OK)


class GodModeNotificationSimulationView(GodModeFullAccessAPIView):

    def post(self, request):
        serializer = GodModeNotificationSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.simulate_notification_delivery(
            request.user,
            target_role=serializer.validated_data.get("target_role", "all"),
            message=serializer.validated_data.get("message", ""),
        )
        return Response(result, status=status.HTTP_200_OK)
