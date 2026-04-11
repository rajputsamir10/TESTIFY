from django.urls import path

from apps.god.views import (
    GodOrganizationDetailView,
    GodOrganizationListCreateView,
    GodOrganizationPlanPatchView,
    GodOrganizationSuspendPatchView,
    GodStatsView,
    GodUserDetailView,
    GodUserListCreateView,
    GodUserResetPasswordView,
)

urlpatterns = [
    path("stats/", GodStatsView.as_view()),
    path("organizations/", GodOrganizationListCreateView.as_view()),
    path("organizations/<uuid:org_id>/", GodOrganizationDetailView.as_view()),
    path("organizations/<uuid:org_id>/plan/", GodOrganizationPlanPatchView.as_view()),
    path("organizations/<uuid:org_id>/suspend/", GodOrganizationSuspendPatchView.as_view()),
    path("users/", GodUserListCreateView.as_view()),
    path("users/<uuid:user_id>/", GodUserDetailView.as_view()),
    path("users/<uuid:user_id>/reset-password/", GodUserResetPasswordView.as_view()),
]
