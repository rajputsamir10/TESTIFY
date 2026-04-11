from django.urls import path

from apps.accounts.views import (
    AdminUserDeleteView,
    AdminUserListCreateView,
    AdminUserResetPasswordView,
)

urlpatterns = [
    path("users/", AdminUserListCreateView.as_view()),
    path("users/create/", AdminUserListCreateView.as_view()),
    path("users/<uuid:user_id>/", AdminUserDeleteView.as_view()),
    path("users/<uuid:user_id>/reset-password/", AdminUserResetPasswordView.as_view()),
]
