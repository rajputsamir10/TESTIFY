from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.departments.models import Course, Department


def _get_admin_org(user):
    if user.role != "admin":
        raise PermissionDenied("Only admin can access this endpoint.")
    if not user.organization:
        raise ValidationError({"organization": "Admin has no organization."})
    return user.organization


def list_departments(user):
    org = _get_admin_org(user)
    return Department.objects.filter(organization=org).order_by("name")


def create_department(user, payload):
    org = _get_admin_org(user)
    code = payload.get("code")
    if Department.objects.filter(organization=org, code=code).exists():
        raise ValidationError({"code": "Department code already exists for this organization."})
    return Department.objects.create(
        organization=org,
        name=payload.get("name"),
        code=code,
    )


def update_department(user, department_id, payload):
    org = _get_admin_org(user)
    dept = Department.objects.filter(id=department_id, organization=org).first()
    if not dept:
        raise NotFound("Department not found.")

    if "name" in payload:
        dept.name = payload["name"]
    if "code" in payload:
        if (
            Department.objects.filter(organization=org, code=payload["code"])
            .exclude(id=dept.id)
            .exists()
        ):
            raise ValidationError({"code": "Department code already exists for this organization."})
        dept.code = payload["code"]

    dept.save()
    return dept


def delete_department(user, department_id):
    org = _get_admin_org(user)
    dept = Department.objects.filter(id=department_id, organization=org).first()
    if not dept:
        raise NotFound("Department not found.")
    dept.delete()


def list_courses(user):
    org = _get_admin_org(user)
    return Course.objects.filter(organization=org).select_related("department").order_by("name")


def create_course(user, payload):
    org = _get_admin_org(user)
    department_value = payload.get("department")
    department_id = getattr(department_value, "id", department_value)
    department = Department.objects.filter(id=department_id, organization=org).first()
    if not department:
        raise ValidationError({"department": "Invalid department."})

    code = payload.get("code")
    if Course.objects.filter(organization=org, code=code).exists():
        raise ValidationError({"code": "Course code already exists for this organization."})

    return Course.objects.create(
        organization=org,
        department=department,
        name=payload.get("name"),
        code=code,
    )


def delete_course(user, course_id):
    org = _get_admin_org(user)
    course = Course.objects.filter(id=course_id, organization=org).first()
    if not course:
        raise NotFound("Course not found.")
    course.delete()
