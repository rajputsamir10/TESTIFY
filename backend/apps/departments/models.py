import uuid

from django.db import models


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="departments",
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="uniq_org_department_code",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="courses",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="courses",
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="uniq_org_course_code",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"
