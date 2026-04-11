from rest_framework.permissions import BasePermission


class IsGod(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "god"


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
