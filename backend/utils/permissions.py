from rest_framework.permissions import BasePermission
from django.conf import settings


def is_god_user(user):
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, "is_superuser", False)
            or getattr(user, "role", None) == "god"
        )
    )


class IsGod(BasePermission):
    def has_permission(self, request, view):
        return is_god_user(request.user)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "teacher"


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "student"


class IsAdminOrTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ["admin", "teacher"]


class SameOrganization(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "god":
            return True
        if hasattr(obj, "organization"):
            return obj.organization_id == request.user.organization_id
        return True


class IsGodModeAuthorized(BasePermission):
    message = "You do not have access to God Mode."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        return get_god_mode_access_mode(user) is not None


class IsGodModeFullAccess(BasePermission):
    message = "You have read-only God Mode access."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        return get_god_mode_access_mode(user) == "full"


def get_god_mode_access_mode(user):
    if not user or not user.is_authenticated:
        return None

    if is_god_user(user):
        return "full"

    email = (getattr(user, "email", "") or "").strip().lower()
    if not email:
        return None

    tester_emails = {value.strip().lower() for value in settings.GOD_MODE_AUTHORIZED_TESTERS}
    developer_emails = {value.strip().lower() for value in settings.GOD_MODE_DEVELOPER_EMAILS}

    if email in developer_emails:
        return "full"
    if email in tester_emails:
        return "read_only"
    return None
