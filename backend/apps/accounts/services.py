import logging
import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CustomUser, OTPCode
from apps.departments.models import Course, Department
from apps.notifications.models import Notification
from apps.organizations.models import Organization
from utils.email_utils import send_platform_email
from utils.plan_limits import ensure_user_limit
from utils.token_utils import CustomTokenObtainPairSerializer

logger = logging.getLogger(__name__)

MAX_FAILED_LOGINS = 10
LOCK_MINUTES = 30
OTP_MINUTES = 10
ADMIN_SIGNUP_OTP_MINUTES = 10


class LockedAccountError(APIException):
    status_code = status.HTTP_423_LOCKED
    default_detail = "Account locked. Try again later."


def _generate_tokens(user: CustomUser) -> dict:
    refresh = CustomTokenObtainPairSerializer.get_token(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def _normalized_email(email: str) -> str:
    return str(email or "").strip().lower()


def _admin_signup_otp_cache_key(email: str) -> str:
    return f"admin_signup_otp:{_normalized_email(email)}"


def _admin_signup_verified_cache_key(email: str) -> str:
    return f"admin_signup_verified:{_normalized_email(email)}"


def _is_admin_signup_verified(email: str) -> bool:
    return bool(cache.get(_admin_signup_verified_cache_key(email)))


def _clear_admin_signup_verification(email: str):
    cache.delete(_admin_signup_otp_cache_key(email))
    cache.delete(_admin_signup_verified_cache_key(email))


def _lock_user(user: CustomUser):
    user.locked_until = timezone.now() + timedelta(minutes=LOCK_MINUTES)
    user.save(update_fields=["locked_until"])
    Notification.objects.create(
        organization=user.organization,
        recipient=user,
        notif_type="account_locked",
        message=f"Your account has been locked until {user.locked_until} due to repeated failed logins.",
    )


def _check_lockout(user: CustomUser):
    if user.locked_until and user.locked_until > timezone.now():
        raise LockedAccountError(
            detail=f"Account locked. Try again after {user.locked_until.isoformat()}."
        )


def _on_failed_login(user: CustomUser):
    user.failed_login_count += 1
    if user.failed_login_count >= MAX_FAILED_LOGINS:
        logger.warning("Account locked after max login failures: %s", user.email)
        user.failed_login_count = MAX_FAILED_LOGINS
        user.save(update_fields=["failed_login_count"])
        _lock_user(user)
    else:
        user.save(update_fields=["failed_login_count"])


def _on_success_login(user: CustomUser):
    if user.failed_login_count != 0 or user.locked_until is not None:
        user.failed_login_count = 0
        user.locked_until = None
        user.save(update_fields=["failed_login_count", "locked_until"])


def _authenticate_user(user: CustomUser, password: str) -> dict:
    _check_lockout(user)

    if not user.check_password(password):
        _on_failed_login(user)
        logger.info("Failed login attempt for %s", user.email)
        raise ValidationError({"detail": "Invalid credentials."})

    _on_success_login(user)
    logger.info("Successful login for %s", user.email)
    send_platform_email(
        user.email,
        "Testify login alert",
        (
            f"Hi {user.full_name},\n\n"
            f"A login to your Testify account was detected at {timezone.now().isoformat()}.\n"
            "If this was not you, please reset your password immediately.\n\n"
            "- Testify"
        ),
    )
    return _generate_tokens(user)


def _send_welcome_email(user: CustomUser):
    send_platform_email(
        user.email,
        "Welcome to Testify",
        (
            f"Hi {user.full_name},\n\n"
            "Your Testify account has been created successfully.\n"
            "You can now sign in and start using the platform.\n\n"
            "- Testify"
        ),
    )


def request_admin_signup_otp(email: str) -> str:
    normalized_email = _normalized_email(email)
    if not normalized_email:
        raise ValidationError({"email": "Email is required."})

    if CustomUser.objects.filter(email__iexact=normalized_email).exists():
        raise ValidationError({"email": "Email already registered."})

    otp = f"{secrets.randbelow(1000000):06d}"
    cache.set(
        _admin_signup_otp_cache_key(normalized_email),
        otp,
        timeout=ADMIN_SIGNUP_OTP_MINUTES * 60,
    )
    cache.delete(_admin_signup_verified_cache_key(normalized_email))

    send_platform_email(
        normalized_email,
        "Testify admin signup verification code",
        (
            "Your Testify admin signup verification code is "
            f"{otp}. It expires in {ADMIN_SIGNUP_OTP_MINUTES} minutes."
        ),
    )
    logger.info("Admin signup OTP issued for %s", normalized_email)
    return normalized_email


def verify_admin_signup_otp(email: str, submitted_code: str):
    normalized_email = _normalized_email(email)
    if not normalized_email:
        raise ValidationError({"email": "Email is required."})

    cached_code = cache.get(_admin_signup_otp_cache_key(normalized_email))
    if not cached_code:
        raise ValidationError({"detail": "Verification code expired or not requested."})

    if str(submitted_code or "").strip() != str(cached_code):
        raise ValidationError({"detail": "Invalid verification code."})

    cache.set(
        _admin_signup_verified_cache_key(normalized_email),
        True,
        timeout=ADMIN_SIGNUP_OTP_MINUTES * 60,
    )
    cache.delete(_admin_signup_otp_cache_key(normalized_email))


def admin_signup(data: dict) -> dict:
    email = _normalized_email(data["email"])

    if not _is_admin_signup_verified(email):
        raise ValidationError({"detail": "Please verify your email with OTP before signup."})

    if CustomUser.objects.filter(email__iexact=email).exists():
        raise ValidationError({"email": "Email already registered."})

    if Organization.objects.filter(email=data["organization_email"]).exists():
        raise ValidationError({"organization_email": "Organization email already registered."})

    with transaction.atomic():
        org = Organization.objects.create(
            name=data["organization_name"],
            email=data["organization_email"],
            plan="free",
        )
        user = CustomUser.objects.create_user(
            full_name=data["full_name"],
            email=email,
            password=data["password"],
            role="admin",
            organization=org,
            is_staff=True,
        )

    _clear_admin_signup_verification(email)
    _send_welcome_email(user)

    tokens = _generate_tokens(user)
    return {"user": user, "organization": org, **tokens}


def admin_login(email: str, password: str) -> dict:
    normalized_email = _normalized_email(email)
    qs = CustomUser.objects.filter(email__iexact=normalized_email, role="admin")
    count = qs.count()

    if count == 0:
        logger.info("Admin login failed for %s", normalized_email)
        raise ValidationError({"detail": "Invalid credentials."})
    if count > 1:
        logger.warning("Admin login ambiguity for %s", normalized_email)
        raise ValidationError({"detail": "Invalid credentials."})

    user = qs.first()
    return {"user": user, **_authenticate_user(user, password)}


def teacher_login(teacher_id: str, password: str) -> dict:
    qs = CustomUser.objects.filter(
        role="teacher",
        teacher_id=teacher_id,
        organization__is_active=True,
    )
    count = qs.count()

    if count == 0:
        logger.info("Teacher login failed for teacher_id=%s", teacher_id)
        raise ValidationError({"detail": "Invalid credentials."})
    if count > 1:
        logger.warning("Teacher login ambiguity for teacher_id=%s", teacher_id)
        raise ValidationError({"detail": "Invalid credentials."})

    user = qs.first()
    return {"user": user, **_authenticate_user(user, password)}


def student_login(roll_number: str, password: str) -> dict:
    qs = CustomUser.objects.filter(
        role="student",
        roll_number=roll_number,
        organization__is_active=True,
    )
    count = qs.count()

    if count == 0:
        logger.info("Student login failed for roll_number=%s", roll_number)
        raise ValidationError({"detail": "Invalid credentials."})
    if count > 1:
        logger.warning("Student login ambiguity for roll_number=%s", roll_number)
        raise ValidationError({"detail": "Invalid credentials."})

    user = qs.first()
    return {"user": user, **_authenticate_user(user, password)}


def god_login(email: str, password: str) -> dict:
    normalized_email = _normalized_email(email)
    qs = CustomUser.objects.filter(email__iexact=normalized_email, role="god")
    count = qs.count()

    if count == 0:
        logger.info("God login failed for %s", normalized_email)
        raise ValidationError({"detail": "Invalid credentials."})
    if count > 1:
        logger.warning("God login ambiguity for %s", normalized_email)
        raise ValidationError({"detail": "Invalid credentials."})

    user = qs.first()
    return {"user": user, **_authenticate_user(user, password)}


def logout_user(refresh_token: str):
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except Exception as exc:
        raise ValidationError({"detail": "Invalid refresh token."}) from exc


def change_password(user: CustomUser, old_password: str, new_password: str):
    if not user.check_password(old_password):
        raise ValidationError({"old_password": "Old password is incorrect."})

    user.set_password(new_password)
    user.save(update_fields=["password"])
    Notification.objects.create(
        organization=user.organization,
        recipient=user,
        notif_type="password_changed",
        message="Your password has been changed successfully.",
    )


def _resolve_user_for_forgot_password(identifier: str) -> CustomUser:
    cleaned = str(identifier).strip()

    if not cleaned:
        raise ValidationError({"identifier": "Identifier is required."})

    if "@" in cleaned:
        try:
            return CustomUser.objects.get(email__iexact=cleaned)
        except CustomUser.DoesNotExist as exc:
            raise NotFound("No account found with this email.") from exc

    teacher_matches = list(CustomUser.objects.filter(teacher_id=cleaned))
    roll_matches = list(CustomUser.objects.filter(roll_number=cleaned))
    matches = teacher_matches + [user for user in roll_matches if user not in teacher_matches]

    if not matches:
        raise NotFound("No account found with this identifier.")

    if len(matches) > 1:
        raise ValidationError(
            {"identifier": "Multiple accounts found. Use email for password reset."}
        )

    return matches[0]


def forgot_password(identifier: str):
    user = _resolve_user_for_forgot_password(identifier)
    email = user.email

    raw_code = f"{secrets.randbelow(1000000):06d}"
    now = timezone.now()
    expires_at = now + timedelta(minutes=OTP_MINUTES)

    OTPCode.objects.filter(user=user, is_used=False).update(is_used=True)
    otp = OTPCode.objects.create(
        user=user,
        code=make_password(raw_code),
        expires_at=expires_at,
    )

    logger.info("OTP requested for %s", email)
    send_mail(
        subject="Testify password reset OTP",
        message=f"Your OTP is {raw_code}. It expires in {OTP_MINUTES} minutes.",
        from_email=None,
        recipient_list=[email],
        fail_silently=False,
    )

    return email


def verify_otp(email: str, submitted_code: str):
    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist as exc:
        raise NotFound("No account found with this email.") from exc

    otp = OTPCode.objects.filter(user=user, is_used=False).order_by("-created_at").first()
    if not otp:
        raise ValidationError({"detail": "No active OTP found."})

    if not otp.is_valid():
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        raise ValidationError({"detail": "OTP expired or invalidated."})

    if not check_password(submitted_code, otp.code):
        otp.attempts += 1
        if otp.attempts >= 3:
            otp.is_used = True
        otp.save(update_fields=["attempts", "is_used"])
        raise ValidationError({"detail": "Invalid OTP."})

    otp.is_used = True
    otp.save(update_fields=["is_used"])

    cache_key = f"otp_verified:{user.id}"
    cache_code_key = f"otp_verified_code:{user.id}"
    cache.set(cache_key, True, timeout=OTP_MINUTES * 60)
    cache.set(cache_code_key, submitted_code, timeout=OTP_MINUTES * 60)


def reset_password(email: str, submitted_code: str, new_password: str):
    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist as exc:
        raise NotFound("No account found with this email.") from exc

    cache_key = f"otp_verified:{user.id}"
    cache_code_key = f"otp_verified_code:{user.id}"

    if not cache.get(cache_key):
        raise ValidationError({"detail": "OTP has not been verified."})

    cached_code = cache.get(cache_code_key)
    if cached_code != submitted_code:
        raise ValidationError({"detail": "OTP code mismatch."})

    user.set_password(new_password)
    user.failed_login_count = 0
    user.locked_until = None
    user.save(update_fields=["password", "failed_login_count", "locked_until"])

    Notification.objects.create(
        organization=user.organization,
        recipient=user,
        notif_type="password_changed",
        message="Your password has been reset successfully.",
    )

    cache.delete(cache_key)
    cache.delete(cache_code_key)


def get_user_me(user: CustomUser) -> CustomUser:
    return user


def list_admin_users(current_user: CustomUser):
    queryset = CustomUser.objects.exclude(role="god").select_related(
        "organization", "department", "course"
    )
    if current_user.role != "god":
        queryset = queryset.filter(organization_id=current_user.organization_id)
    return queryset.order_by("-created_at")


def create_org_user(current_user: CustomUser, payload: dict) -> CustomUser:
    if current_user.role not in ["admin", "god"]:
        raise PermissionDenied("Only admin or god can create users.")

    organization = payload.get("organization")
    if current_user.role != "god":
        organization = current_user.organization

    if not organization:
        raise ValidationError({"organization": "Organization is required."})

    role = payload["role"]
    email = payload.get("email")

    if not email:
        raise ValidationError({"email": "email is required."})

    if role in ["teacher", "student"] and current_user.role != "god":
        current_count = CustomUser.objects.filter(organization=organization, role=role).count()
        ensure_user_limit(organization, role, current_count)

    department = None
    course = None

    if payload.get("department_id"):
        department = Department.objects.filter(
            id=payload["department_id"], organization=organization
        ).first()
        if not department:
            raise ValidationError({"department_id": "Invalid department for organization."})

    if payload.get("course_id"):
        course = Course.objects.filter(id=payload["course_id"], organization=organization).first()
        if not course:
            raise ValidationError({"course_id": "Invalid course for organization."})

    user = CustomUser.objects.create_user(
        full_name=payload["full_name"],
        email=email,
        password=payload["password"],
        role=role,
        organization=organization,
        department=department,
        course=course,
        batch_year=payload.get("batch_year"),
        roll_number=payload.get("roll_number"),
        teacher_id=payload.get("teacher_id"),
        is_staff=role in ["admin", "teacher"],
    )
    _send_welcome_email(user)
    return user


def delete_org_user(current_user: CustomUser, user_id):
    qs = CustomUser.objects.exclude(role="god")
    if current_user.role != "god":
        qs = qs.filter(organization_id=current_user.organization_id)

    user = qs.filter(id=user_id).first()
    if not user:
        raise NotFound("User not found.")

    user.delete()


def reset_user_password(current_user: CustomUser, user_id, new_password: str):
    qs = CustomUser.objects.exclude(role="god")
    if current_user.role != "god":
        qs = qs.filter(organization_id=current_user.organization_id)

    user = qs.filter(id=user_id).first()
    if not user:
        raise NotFound("User not found.")

    user.set_password(new_password)
    user.failed_login_count = 0
    user.locked_until = None
    user.save(update_fields=["password", "failed_login_count", "locked_until"])
    return user


def platform_user_counts():
    return CustomUser.objects.values("role").annotate(total=Count("id"))
