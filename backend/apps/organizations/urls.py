from django.urls import path

from apps.organizations.views import (
    AdminOrganizationPlanView,
    AdminOrganizationStatsView,
    AdminOrganizationView,
)

urlpatterns = [
    path("organization/", AdminOrganizationView.as_view()),
    path("organization/stats/", AdminOrganizationStatsView.as_view()),
    path("organization/plan/", AdminOrganizationPlanView.as_view()),
]
