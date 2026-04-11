from django.db.models import Count
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.attempts.models import Attempt
from apps.exams.models import Exam
from apps.organizations.models import Organization
from apps.results.models import Result
from apps.accounts.models import CustomUser


def _get_admin_org(user):
    if user.role != "admin":
        raise PermissionDenied("Only admin can access this endpoint.")
    if not user.organization:
        raise ValidationError({"organization": "Admin user is not linked to organization."})
    return user.organization


def get_organization_for_admin(user):
    return _get_admin_org(user)


def update_organization_for_admin(user, payload):
    org = _get_admin_org(user)
    allowed_fields = ["name", "email", "logo"]
    for field in allowed_fields:
        if field in payload:
            setattr(org, field, payload[field])
    org.save()
    return org


def get_organization_stats(user):
    org = _get_admin_org(user)
    users_by_role = list(
        CustomUser.objects.filter(organization=org).values("role").annotate(total=Count("id"))
    )
    return {
        "organization_id": org.id,
        "organization_name": org.name,
        "users_total": CustomUser.objects.filter(organization=org).count(),
        "users_by_role": users_by_role,
        "departments_total": org.departments.count(),
        "courses_total": org.courses.count(),
        "exams_total": Exam.objects.filter(organization=org).count(),
        "attempts_total": Attempt.objects.filter(organization=org).count(),
        "results_total": Result.objects.filter(organization=org).count(),
    }


def get_organization_plan(user):
    org = _get_admin_org(user)
    return {
        "plan": org.plan,
        "is_active": org.is_active,
    }
