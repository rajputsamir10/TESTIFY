from django.db import transaction
from django.db.models import Count
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.accounts.models import CustomUser
from apps.departments.models import Course, Department
from apps.exams.models import Exam
from apps.organizations.models import Organization
from apps.results.models import Result


def _require_god(user):
    if user.role != "god":
        raise PermissionDenied("Forbidden")


def get_platform_stats(user):
    _require_god(user)
    return {
        "organizations_total": Organization.objects.count(),
        "users_total": CustomUser.objects.count(),
        "exams_total": Exam.objects.count(),
        "results_total": Result.objects.count(),
        "users_by_role": list(
            CustomUser.objects.values("role").annotate(total=Count("id")).order_by("role")
        ),
    }


def list_organizations(user):
    _require_god(user)
    return Organization.objects.all().order_by("-created_at")


def create_organization(user, payload):
    _require_god(user)
    return Organization.objects.create(**payload)


def get_organization(user, org_id):
    _require_god(user)
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        raise NotFound("Organization not found.")
    return org


def update_organization(user, org_id, payload):
    org = get_organization(user, org_id)
    for field in ["name", "email", "logo", "plan", "is_active"]:
        if field in payload:
            setattr(org, field, payload[field])
    org.save()
    return org


def delete_organization(user, org_id):
    org = get_organization(user, org_id)
    org_user_ids = list(
        CustomUser.objects.filter(organization_id=org_id)
        .exclude(role="god")
        .values_list("id", flat=True)
    )

    with transaction.atomic():
        if org_user_ids:
            CustomUser.objects.filter(id__in=org_user_ids).delete()
        org.delete()

    if Organization.objects.filter(id=org_id).exists():
        raise ValidationError({"detail": "Failed to delete organization."})
    if org_user_ids and CustomUser.objects.filter(id__in=org_user_ids).exists():
        raise ValidationError({"detail": "Failed to delete organization users."})


def patch_organization_plan(user, org_id, plan):
    org = get_organization(user, org_id)
    if plan not in ["free", "pro", "enterprise"]:
        raise ValidationError({"plan": "Invalid plan."})
    org.plan = plan
    org.save(update_fields=["plan"])
    return org


def patch_organization_suspend(user, org_id, is_active):
    org = get_organization(user, org_id)
    org.is_active = is_active
    org.save(update_fields=["is_active"])
    return org


def list_users(user):
    _require_god(user)
    return CustomUser.objects.select_related("organization", "department", "course").order_by("-created_at")


def create_user(user, payload):
    _require_god(user)

    role = payload["role"]
    organization = None
    department = None
    course = None

    org_id = payload.get("organization_id")
    if role != "god":
        if not org_id:
            raise ValidationError({"organization_id": "organization_id is required for non-god users."})
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            raise ValidationError({"organization_id": "Invalid organization_id."})

    if payload.get("department_id"):
        department = Department.objects.filter(id=payload["department_id"]).first()
        if not department:
            raise ValidationError({"department_id": "Invalid department_id."})
        if organization and department.organization_id != organization.id:
            raise ValidationError({"department_id": "Department does not belong to organization."})

    if payload.get("course_id"):
        course = Course.objects.filter(id=payload["course_id"]).first()
        if not course:
            raise ValidationError({"course_id": "Invalid course_id."})
        if organization and course.organization_id != organization.id:
            raise ValidationError({"course_id": "Course does not belong to organization."})

    if role == "god":
        organization = None
        department = None
        course = None

    created = CustomUser.objects.create_user(
        full_name=payload["full_name"],
        email=payload["email"],
        password=payload["password"],
        role=role,
        organization=organization,
        department=department,
        course=course,
        roll_number=payload.get("roll_number"),
        teacher_id=payload.get("teacher_id"),
        batch_year=payload.get("batch_year"),
        is_staff=role in ["god", "admin", "teacher"],
        is_superuser=role == "god",
    )
    return created


def get_user(user, target_user_id):
    _require_god(user)
    target = CustomUser.objects.filter(id=target_user_id).first()
    if not target:
        raise NotFound("User not found.")
    return target


def update_user(user, target_user_id, payload):
    target = get_user(user, target_user_id)

    for field in ["full_name", "email", "role", "is_active", "roll_number", "teacher_id", "batch_year"]:
        if field in payload:
            setattr(target, field, payload[field])

    if "organization_id" in payload:
        org_id = payload.get("organization_id")
        if org_id is None:
            target.organization = None
        else:
            org = Organization.objects.filter(id=org_id).first()
            if not org:
                raise ValidationError({"organization_id": "Invalid organization_id."})
            target.organization = org

    if "department_id" in payload:
        dept_id = payload.get("department_id")
        if dept_id is None:
            target.department = None
        else:
            dept = Department.objects.filter(id=dept_id).first()
            if not dept:
                raise ValidationError({"department_id": "Invalid department_id."})
            if target.organization_id and dept.organization_id != target.organization_id:
                raise ValidationError({"department_id": "Department does not belong to organization."})
            target.department = dept

    if "course_id" in payload:
        course_id = payload.get("course_id")
        if course_id is None:
            target.course = None
        else:
            course = Course.objects.filter(id=course_id).first()
            if not course:
                raise ValidationError({"course_id": "Invalid course_id."})
            if target.organization_id and course.organization_id != target.organization_id:
                raise ValidationError({"course_id": "Course does not belong to organization."})
            target.course = course

    if target.role == "god":
        target.organization = None
        target.department = None
        target.course = None
        target.roll_number = None
        target.teacher_id = None
        target.is_staff = True
        target.is_superuser = True
    else:
        target.is_superuser = False
        target.is_staff = target.role in ["admin", "teacher"]

    target.save()
    return target


def delete_user(user, target_user_id):
    target = get_user(user, target_user_id)
    target.delete()
    if CustomUser.objects.filter(id=target_user_id).exists():
        raise ValidationError({"detail": "Failed to delete user."})


def reset_user_password(user, target_user_id, new_password):
    target = get_user(user, target_user_id)
    target.set_password(new_password)
    target.failed_login_count = 0
    target.locked_until = None
    target.save(update_fields=["password", "failed_login_count", "locked_until"])
    return target
