from django.db.models import QuerySet


def filter_by_org(queryset: QuerySet, user):
    if user.role == "god":
        return queryset
    return queryset.filter(organization_id=user.organization_id)


def filter_by_org_and_department(queryset: QuerySet, user):
    if user.role == "god":
        return queryset

    queryset = queryset.filter(organization_id=user.organization_id)

    if user.role in ["teacher", "student"] and hasattr(queryset.model, "department"):
        queryset = queryset.filter(department_id=user.department_id)

    return queryset


def get_user_org(request):
    return request.user.organization
