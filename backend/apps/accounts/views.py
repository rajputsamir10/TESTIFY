from datetime import timedelta

from django.conf import settings
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts import services
from apps.accounts.serializers import (
    AdminLoginSerializer,
    AdminSignupSerializer,
    AdminSignupOTPRequestSerializer,
    AdminSignupOTPVerifySerializer,
    AdminUserCreateSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    GodLoginSerializer,
    ResetPasswordSerializer,
    StudentLoginSerializer,
    TeacherLoginSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)


def _set_auth_cookies(response, access_token=None, refresh_token=None):
    if access_token:
        response.set_cookie(
            settings.AUTH_COOKIE_ACCESS_NAME,
            access_token,
            max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"] / timedelta(seconds=1)),
            httponly=True,
            secure=settings.AUTH_COOKIE_SECURE,
            samesite=settings.AUTH_COOKIE_SAMESITE,
            domain=settings.AUTH_COOKIE_DOMAIN,
            path="/",
        )

    if refresh_token:
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH_NAME,
            refresh_token,
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"] / timedelta(seconds=1)),
            httponly=True,
            secure=settings.AUTH_COOKIE_SECURE,
            samesite=settings.AUTH_COOKIE_SAMESITE,
            domain=settings.AUTH_COOKIE_DOMAIN,
            path="/",
        )


def _clear_auth_cookies(response):
    response.delete_cookie(
        settings.AUTH_COOKIE_ACCESS_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path="/",
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.AUTH_COOKIE_REFRESH_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path="/",
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


class AdminSignupOTPRequestView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = AdminSignupOTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = services.request_admin_signup_otp(serializer.validated_data["email"])
        return Response(
            {"detail": "Verification code sent to email.", "email": email},
            status=status.HTTP_200_OK,
        )


class AdminSignupOTPVerifyView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = AdminSignupOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.verify_admin_signup_otp(
            serializer.validated_data["email"],
            serializer.validated_data["otp"],
        )
        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)


class AdminSignupView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="3/h", method="POST", block=True))
    def post(self, request):
        serializer = AdminSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.admin_signup(serializer.validated_data)
        response = Response(
            {
                "message": "Admin signup successful.",
                "access": result["access"],
                "refresh": result["refresh"],
                "user": UserSerializer(result["user"]).data,
            },
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, result["access"], result["refresh"])
        return response


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.admin_login(**serializer.validated_data)
        response = Response(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "user": UserSerializer(result["user"]).data,
            }
        )
        _set_auth_cookies(response, result["access"], result["refresh"])
        return response


class TeacherLoginView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = TeacherLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.teacher_login(**serializer.validated_data)
        response = Response(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "user": UserSerializer(result["user"]).data,
            }
        )
        _set_auth_cookies(response, result["access"], result["refresh"])
        return response


class StudentLoginView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = StudentLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.student_login(**serializer.validated_data)
        if result["user"].role != "student":
            raise PermissionDenied("Student login is only for student accounts.")
        response = Response(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "user": UserSerializer(result["user"]).data,
            }
        )
        _set_auth_cookies(response, result["access"], result["refresh"])
        return response


class GodLoginView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = GodLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.god_login(**serializer.validated_data)
        response = Response(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "user": UserSerializer(result["user"]).data,
            }
        )
        _set_auth_cookies(response, result["access"], result["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.data.get("refresh") or request.COOKIES.get(settings.AUTH_COOKIE_REFRESH_NAME)

        if refresh:
            try:
                services.logout_user(refresh)
            except Exception:
                pass

        response = Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
        _clear_auth_cookies(response)
        return response


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.change_password(request.user, **serializer.validated_data)
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = services.forgot_password(
            serializer.validated_data["identifier"],
            serializer.validated_data.get("role"),
        )
        return Response(
            {"detail": "OTP sent to email.", "email": email},
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/m", method="POST", block=True))
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.verify_otp(
            serializer.validated_data["email"],
            serializer.validated_data["otp"],
            serializer.validated_data.get("role"),
        )
        return Response({"detail": "OTP verified successfully."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reset_password(
            serializer.validated_data["email"],
            serializer.validated_data["otp"],
            serializer.validated_data["new_password"],
            serializer.validated_data.get("role"),
        )
        return Response({"detail": "Password reset successful."}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(services.get_user_me(request.user)).data, status=status.HTTP_200_OK)


class AdminUserListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = services.list_admin_users(request.user)
        return Response(UserSerializer(users, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.create_org_user(request.user, serializer.validated_data)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        services.delete_org_user(request.user, user_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserResetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        new_password = request.data.get("new_password")
        if not new_password:
            return Response(
                {"detail": "new_password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = services.reset_user_password(request.user, user_id, new_password)
        return Response({"detail": f"Password reset for {user.email}."}, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        payload = request.data.copy()
        if not payload.get("refresh"):
            cookie_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH_NAME)
            if cookie_refresh:
                payload["refresh"] = cookie_refresh

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        _set_auth_cookies(
            response,
            serializer.validated_data.get("access"),
            serializer.validated_data.get("refresh"),
        )
        return response
