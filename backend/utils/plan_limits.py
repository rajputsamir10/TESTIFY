from rest_framework.exceptions import ValidationError


PLAN_LIMITS = {
    "free": {
        "max_teachers": 5,
        "max_students": 100,
        "max_exams": 10,
        "ai_practice": False,
        "analytics": False,
    },
    "pro": {
        "max_teachers": 50,
        "max_students": 1000,
        "max_exams": 999999,
        "ai_practice": True,
        "analytics": True,
    },
    "enterprise": {
        "max_teachers": 999999,
        "max_students": 999999,
        "max_exams": 999999,
        "ai_practice": True,
        "analytics": True,
    },
}


def get_org_plan_limit(organization, key: str):
    plan = (organization.plan if organization else "free") or "free"
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])[key]


def ensure_user_limit(organization, role: str, current_count: int):
    if role == "teacher":
        limit_key = "max_teachers"
    elif role == "student":
        limit_key = "max_students"
    else:
        return

    limit = get_org_plan_limit(organization, limit_key)
    if current_count >= limit:
        raise ValidationError({"detail": f"{role.title()} limit reached for {organization.plan} plan."})


def ensure_exam_limit(organization, current_count: int):
    limit = get_org_plan_limit(organization, "max_exams")
    if current_count >= limit:
        raise ValidationError({"detail": f"Exam limit reached for {organization.plan} plan."})
