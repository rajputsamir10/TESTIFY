from django.urls import path

from apps.accounts.views import (
    AdminLoginView,
    AdminSignupView,
    AdminSignupOTPRequestView,
    AdminSignupOTPVerifyView,
    ChangePasswordView,
    CustomTokenRefreshView,
    ForgotPasswordView,
    GodLoginView,
    LogoutView,
    MeView,
    ResetPasswordView,
    StudentLoginView,
    TeacherLoginView,
    VerifyOTPView,
)

urlpatterns = [
    path("admin/signup/request-otp/", AdminSignupOTPRequestView.as_view()),
    path("admin/signup/verify-otp/", AdminSignupOTPVerifyView.as_view()),
    path("admin/signup/", AdminSignupView.as_view()),
    path("admin/login/", AdminLoginView.as_view()),
    path("teacher/login/", TeacherLoginView.as_view()),
    path("student/login/", StudentLoginView.as_view()),
    path("god/login/", GodLoginView.as_view()),
    path("token/refresh/", CustomTokenRefreshView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("verify-otp/", VerifyOTPView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
    path("me/", MeView.as_view()),
]
