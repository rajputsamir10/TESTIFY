import uuid

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models import Q


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        role = extra_fields.get("role")
        if role == "god":
            extra_fields["is_staff"] = True
            extra_fields["is_superuser"] = True
            extra_fields["organization"] = None
        else:
            extra_fields.setdefault("is_staff", False)
            extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        # Superusers are always platform god users.
        extra_fields["role"] = "god"
        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = True
        extra_fields["organization"] = None
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("god", "God"),
        ("admin", "Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
    )
    department = models.ForeignKey(
        "departments.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
    )
    profile_photo = models.ImageField(upload_to="profile_photos/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    roll_number = models.CharField(max_length=50, null=True, blank=True)
    course = models.ForeignKey(
        "departments.Course",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="students",
    )
    batch_year = models.CharField(max_length=20, null=True, blank=True)

    teacher_id = models.CharField(max_length=50, null=True, blank=True)

    failed_login_count = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = CustomUserManager()

    class Meta:
        indexes = [
            models.Index(fields=["role", "organization"]),
            models.Index(fields=["organization", "roll_number"]),
            models.Index(fields=["organization", "teacher_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["role", "email"],
                condition=Q(role__in=["admin", "teacher", "student"]),
                name="uniq_role_email",
            ),
            models.UniqueConstraint(
                fields=["email"],
                condition=Q(role="god"),
                name="uniq_god_email",
            ),
            models.UniqueConstraint(
                fields=["organization", "roll_number"],
                name="uniq_org_roll_number",
            ),
            models.UniqueConstraint(
                fields=["organization", "teacher_id"],
                name="uniq_org_teacher_id",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.role})"


class OTPCode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="otps")
    code = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"OTP for {self.user.email} ({'used' if self.is_used else 'active'})"

    def is_valid(self):
        from django.utils import timezone

        return not self.is_used and self.attempts < 3 and timezone.now() < self.expires_at
