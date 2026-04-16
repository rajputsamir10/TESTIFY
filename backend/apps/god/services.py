import csv
import io
import os
from datetime import timedelta
from time import perf_counter

from django.conf import settings
from django.db import connection
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.accounts.models import CustomUser
from apps.departments.models import Course, Department
from apps.exams.models import Exam
from apps.god.models import GodModeBugReport, GodModeFeatureToggle, GodModeLog, GodModeSetting
from apps.notifications.models import Notification
from apps.organizations.models import Organization
from apps.results.models import Result
from apps.attempts.models import Attempt, PlaygroundSession
from utils.permissions import is_god_user


GOD_MODE_TOGGLE_DEFINITIONS = {
    "anti_cheat_detection": {
        "label": "Anti-Cheat Detection",
        "description": "Enable anti-cheat signal processing for simulations.",
        "default": True,
    },
    "live_proctoring": {
        "label": "Live Proctoring",
        "description": "Enable live proctoring related system checks.",
        "default": True,
    },
    "debug_logging": {
        "label": "Verbose Debug Logs",
        "description": "Store detailed logs for diagnostics and test replay.",
        "default": False,
    },
    "maintenance_mode": {
        "label": "Maintenance Mode",
        "description": "Simulate maintenance restrictions on selected modules.",
        "default": False,
    },
    "failure_injection": {
        "label": "Failure Injection",
        "description": "Enable controlled fake failures for resilience testing.",
        "default": False,
    },
}


GOD_MODE_SETTING_DEFAULTS = {
    "theme": "system",
    "auto_refresh_interval": 30,
    "log_retention_days": 30,
    "notification_sound": True,
}


def _require_god(user):
    if not is_god_user(user):
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


def create_god_mode_log(user, module, level, message, details=None):
    return GodModeLog.objects.create(
        module=module,
        level=level,
        message=message,
        details=details or {},
        created_by=user,
    )


def _set_setting(key, value):
    setting, _ = GodModeSetting.objects.update_or_create(key=key, defaults={"value": value})
    return setting


def _get_setting(key, default=None):
    setting = GodModeSetting.objects.filter(key=key).first()
    if not setting:
        return default
    return setting.value


def _ensure_god_mode_settings():
    for key, default_value in GOD_MODE_SETTING_DEFAULTS.items():
        GodModeSetting.objects.get_or_create(key=key, defaults={"value": default_value})


def _ensure_feature_toggles():
    for key, meta in GOD_MODE_TOGGLE_DEFINITIONS.items():
        GodModeFeatureToggle.objects.get_or_create(
            key=key,
            defaults={
                "label": meta["label"],
                "description": meta["description"],
                "is_enabled": meta["default"],
            },
        )


def _is_toggle_enabled(toggle_key):
    _ensure_feature_toggles()
    toggle = GodModeFeatureToggle.objects.filter(key=toggle_key).first()
    if not toggle:
        return False
    return bool(toggle.is_enabled)


def get_god_mode_overview(user):
    _ensure_feature_toggles()
    _ensure_god_mode_settings()

    now = timezone.now()
    users_by_role_qs = CustomUser.objects.values("role").annotate(total=Count("id")).order_by("role")
    users_by_role = {row["role"]: row["total"] for row in users_by_role_qs}

    active_exams = Exam.objects.filter(start_time__lte=now, end_time__gte=now).count()
    ongoing_attempts = Attempt.objects.filter(status="in_progress").count()
    suspicious_attempts = Attempt.objects.filter(violation_count__gte=3).count()
    open_bug_reports = GodModeBugReport.objects.filter(status__in=["open", "in_progress"]).count()

    latest_logs = (
        GodModeLog.objects.select_related("created_by")
        .order_by("-created_at")
        .values("id", "module", "level", "message", "created_at", "created_by__email")[:10]
    )

    toggles = list(
        GodModeFeatureToggle.objects.order_by("label").values(
            "id", "key", "label", "description", "is_enabled", "updated_at"
        )
    )

    create_god_mode_log(
        user,
        module="dashboard",
        level="info",
        message="Viewed God Mode overview dashboard",
        details={"active_exams": active_exams, "ongoing_attempts": ongoing_attempts},
    )

    return {
        "platform": {
            "organizations_total": Organization.objects.count(),
            "users_total": CustomUser.objects.count(),
            "exams_total": Exam.objects.count(),
            "results_total": Result.objects.count(),
            "users_by_role": users_by_role,
        },
        "live_exam_status": {
            "active_exams": active_exams,
            "ongoing_attempts": ongoing_attempts,
            "submitted_attempts": Attempt.objects.filter(status="submitted").count(),
            "suspicious_attempts": suspicious_attempts,
            "active_playground_sessions": PlaygroundSession.objects.filter(status="generated").count(),
        },
        "health": {
            "open_bug_reports": open_bug_reports,
            "unread_notifications": Notification.objects.filter(is_read=False).count(),
            "maintenance_mode": _is_toggle_enabled("maintenance_mode"),
            "failure_injection": _is_toggle_enabled("failure_injection"),
        },
        "feature_toggles": toggles,
        "recent_logs": list(latest_logs),
    }


def _get_exam_simulation_state():
    state = _get_setting("exam_simulation_state", default={})
    if isinstance(state, dict):
        return state
    return {}


def simulate_exam_action(user, payload):
    action = payload["action"]
    state = _get_exam_simulation_state()
    now = timezone.now().isoformat()

    if action == "start":
        state = {
            "status": "running",
            "started_at": now,
            "duration_minutes": payload["duration_minutes"],
            "question_count": payload["question_count"],
            "subject": payload["subject"],
            "mode": payload["mode"],
            "answered_questions": 0,
            "forced_submitted": False,
        }
        message = "Simulated exam started"
    elif action == "force_timer_end":
        if not state or state.get("status") not in ["running", "timer_ended"]:
            raise ValidationError({"action": "No running simulated exam to force timer end."})
        state["status"] = "timer_ended"
        state["timer_ended_at"] = now
        message = "Simulated exam timer ended"
    elif action == "force_submit":
        if not state or state.get("status") == "submitted":
            raise ValidationError({"action": "No active simulated exam to force submit."})
        state["status"] = "submitted"
        state["submitted_at"] = now
        state["forced_submitted"] = True
        message = "Simulated exam force submitted"
    elif action == "simulate_student_answer":
        if not state or state.get("status") not in ["running", "timer_ended"]:
            raise ValidationError({"action": "No active simulated exam to answer."})
        state["answered_questions"] = min(
            int(state.get("question_count", 0)),
            int(state.get("answered_questions", 0)) + 1,
        )
        message = "Simulated student answer submitted"
    else:
        raise ValidationError({"action": "Unsupported action."})

    _set_setting("exam_simulation_state", state)
    create_god_mode_log(user, module="exam_simulator", level="info", message=message, details={"state": state})

    return {"action": action, "state": state, "message": message}


def simulate_anti_cheat_trigger(user, trigger):
    if not _is_toggle_enabled("anti_cheat_detection"):
        raise ValidationError({"trigger": "Anti-cheat detection toggle is disabled."})

    action_map = {
        "tab_switch": "Warn candidate and increment violation score",
        "browser_minimize": "Capture event and send proctor alert",
        "fullscreen_exit": "Force return to fullscreen",
        "camera_off": "Pause exam and raise high-priority alert",
        "face_not_detected": "Request candidate re-alignment",
        "multiple_faces": "Flag for manual proctor review",
        "no_person_in_frame": "Pause timer and notify proctor",
        "mic_muted": "Show warning and log event",
        "network_disconnect": "Queue auto-reconnect retries",
        "right_click": "Block context menu and log attempt",
        "copy_attempt": "Block clipboard copy",
        "paste_attempt": "Block clipboard paste",
        "keyboard_shortcut": "Block shortcut and issue warning",
        "devtools_open": "Lock exam UI and escalate severity",
    }

    severity = "warning"
    if trigger in ["camera_off", "devtools_open", "multiple_faces", "no_person_in_frame"]:
        severity = "error"

    result = {
        "trigger": trigger,
        "status": "detected",
        "severity": severity,
        "suggested_action": action_map.get(trigger, "Log and review"),
        "timestamp": timezone.now().isoformat(),
    }

    create_god_mode_log(
        user,
        module="anti_cheat",
        level="warning" if severity == "warning" else "error",
        message=f"Anti-cheat trigger simulated: {trigger}",
        details=result,
    )
    return result


def simulate_role_access_preview(user, role):
    all_modules = [
        "dashboard",
        "exam_simulator",
        "anti_cheat",
        "role_access",
        "api_monitor",
        "database_inspector",
        "feature_toggles",
        "activity_logs",
        "stress_test",
        "bug_reporter",
        "settings",
        "notification_simulator",
    ]

    role_map = {
        "god": all_modules,
        "developer": [
            "dashboard",
            "exam_simulator",
            "anti_cheat",
            "role_access",
            "api_monitor",
            "database_inspector",
            "feature_toggles",
            "activity_logs",
            "stress_test",
            "bug_reporter",
            "settings",
            "notification_simulator",
        ],
        "admin": ["dashboard", "activity_logs", "bug_reporter", "notification_simulator"],
        "teacher": ["dashboard", "bug_reporter"],
        "student": ["bug_reporter"],
        "guest": [],
    }

    allowed = role_map.get(role, [])
    blocked = [name for name in all_modules if name not in allowed]
    result = {
        "role": role,
        "allowed_modules": allowed,
        "blocked_modules": blocked,
        "can_open_god_mode": role in ["god", "developer"],
    }

    create_god_mode_log(
        user,
        module="role_access",
        level="info",
        message=f"Role access simulation run for {role}",
        details={"allowed_count": len(allowed), "blocked_count": len(blocked)},
    )
    return result


def _run_health_check(name, probe):
    start = perf_counter()
    try:
        probe()
        elapsed_ms = round((perf_counter() - start) * 1000, 2)
        return {"name": name, "status": "success", "response_time_ms": elapsed_ms, "error": ""}
    except Exception as exc:
        elapsed_ms = round((perf_counter() - start) * 1000, 2)
        return {
            "name": name,
            "status": "failure",
            "response_time_ms": elapsed_ms,
            "error": str(exc)[:300],
        }


def run_api_monitor(user, run_full_suite=True):
    if not run_full_suite:
        cached = _get_setting("api_monitor_last_report", default=None)
        if cached:
            create_god_mode_log(
                user,
                module="api_monitor",
                level="info",
                message="API monitor report fetched from cache",
            )
            return {**cached, "cached": True}

    checks = [
        _run_health_check("auth_me", lambda: CustomUser.objects.only("id").first()),
        _run_health_check("organizations_list", lambda: Organization.objects.only("id").first()),
        _run_health_check("exams_list", lambda: Exam.objects.only("id").first()),
        _run_health_check("attempts_list", lambda: Attempt.objects.only("id").first()),
        _run_health_check("results_list", lambda: Result.objects.only("id").first()),
        _run_health_check("notifications_list", lambda: Notification.objects.only("id").first()),
    ]

    success_count = len([item for item in checks if item["status"] == "success"])
    failure_count = len(checks) - success_count
    avg_response = round(
        sum(item["response_time_ms"] for item in checks) / max(len(checks), 1),
        2,
    )

    report = {
        "generated_at": timezone.now().isoformat(),
        "summary": {
            "total": len(checks),
            "success": success_count,
            "failure": failure_count,
            "average_response_time_ms": avg_response,
        },
        "checks": checks,
    }

    _set_setting("api_monitor_last_report", report)
    create_god_mode_log(
        user,
        module="api_monitor",
        level="warning" if failure_count else "success",
        message="API monitor suite executed",
        details=report["summary"],
    )
    return report


def inspect_database(user):
    db_name = settings.DATABASES["default"].get("NAME")
    db_size_bytes = None
    db_size_mb = None
    if isinstance(db_name, str) and os.path.exists(db_name):
        db_size_bytes = os.path.getsize(db_name)
        db_size_mb = round(db_size_bytes / (1024 * 1024), 3)

    table_names = connection.introspection.table_names()
    model_counts = [
        {"name": "organizations", "rows": Organization.objects.count()},
        {"name": "users", "rows": CustomUser.objects.count()},
        {"name": "exams", "rows": Exam.objects.count()},
        {"name": "attempts", "rows": Attempt.objects.count()},
        {"name": "results", "rows": Result.objects.count()},
        {"name": "notifications", "rows": Notification.objects.count()},
        {"name": "bug_reports", "rows": GodModeBugReport.objects.count()},
        {"name": "god_mode_logs", "rows": GodModeLog.objects.count()},
    ]

    backup_meta = _get_setting("db_backup_meta", default={}) or {}
    response = {
        "database_name": db_name,
        "table_count": len(table_names),
        "tables": table_names,
        "core_model_counts": model_counts,
        "size": {
            "bytes": db_size_bytes,
            "megabytes": db_size_mb,
        },
        "backup": {
            "last_backup_at": backup_meta.get("last_backup_at"),
            "last_backup_status": backup_meta.get("status", "unknown"),
        },
    }

    create_god_mode_log(
        user,
        module="database_inspector",
        level="info",
        message="Database inspector opened",
        details={"table_count": response["table_count"]},
    )
    return response


def list_feature_toggles(user):
    _ensure_feature_toggles()
    create_god_mode_log(
        user,
        module="feature_toggles",
        level="info",
        message="Viewed feature toggles",
    )
    return GodModeFeatureToggle.objects.select_related("updated_by").order_by("label")


def patch_feature_toggle(user, key, is_enabled):
    _ensure_feature_toggles()
    toggle = GodModeFeatureToggle.objects.filter(key=key).first()
    if not toggle:
        raise NotFound("Toggle not found.")

    toggle.is_enabled = bool(is_enabled)
    toggle.updated_by = user
    toggle.save(update_fields=["is_enabled", "updated_by", "updated_at"])

    create_god_mode_log(
        user,
        module="feature_toggles",
        level="warning" if is_enabled else "info",
        message=f"Feature toggle '{key}' set to {bool(is_enabled)}",
        details={"toggle": key, "is_enabled": bool(is_enabled)},
    )
    return toggle


def list_god_mode_logs(user, module=None, level=None, limit=200):
    qs = GodModeLog.objects.select_related("created_by").order_by("-created_at")
    if module:
        qs = qs.filter(module=module)
    if level:
        qs = qs.filter(level=level)

    try:
        resolved_limit = int(limit)
    except (TypeError, ValueError):
        resolved_limit = 200
    limit = min(max(resolved_limit, 1), 1000)
    create_god_mode_log(
        user,
        module="activity_logs",
        level="info",
        message="Viewed activity logs",
        details={"module_filter": module, "level_filter": level, "limit": limit},
    )
    return qs[:limit]


def append_god_mode_log(user, payload):
    return create_god_mode_log(
        user,
        module=payload["module"],
        level=payload.get("level", "info"),
        message=payload["message"],
        details=payload.get("details", {}),
    )


def export_god_mode_logs_csv(user, module=None, level=None, limit=1000):
    logs = list_god_mode_logs(user, module=module, level=level, limit=limit)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "created_at", "module", "level", "message", "created_by_email", "details"])
    for log in logs:
        writer.writerow(
            [
                str(log.id),
                log.created_at.isoformat(),
                log.module,
                log.level,
                log.message,
                log.created_by.email if log.created_by else "",
                log.details,
            ]
        )

    create_god_mode_log(
        user,
        module="activity_logs",
        level="info",
        message="Exported activity logs as CSV",
        details={"row_count": len(logs)},
    )
    return output.getvalue()


def run_stress_test(user, scenario):
    scenario_map = {
        "users_10": {"load_multiplier": 1.0, "virtual_users": 10, "requests": 120},
        "users_100": {"load_multiplier": 1.8, "virtual_users": 100, "requests": 850},
        "requests_1000": {"load_multiplier": 2.2, "virtual_users": 180, "requests": 1000},
        "concurrent_submissions": {"load_multiplier": 2.6, "virtual_users": 240, "requests": 1400},
        "result_generation_load": {"load_multiplier": 3.0, "virtual_users": 300, "requests": 1600},
    }

    config = scenario_map.get(scenario)
    if not config:
        raise ValidationError({"scenario": "Unsupported stress test scenario."})

    users_total = CustomUser.objects.count()
    attempts_total = Attempt.objects.count()
    active_attempts = Attempt.objects.filter(status="in_progress").count()
    multiplier = config["load_multiplier"]

    base_latency = 45 + (users_total * 0.03) + (attempts_total * 0.04)
    p50_ms = round(base_latency * multiplier, 2)
    p95_ms = round(p50_ms * 1.9, 2)
    error_rate = round(min(25.0, 0.3 + (multiplier * 1.8) + (active_attempts * 0.02)), 2)
    cpu_percent = round(min(98.0, 18 + (multiplier * 22) + (active_attempts * 0.05)), 2)
    memory_percent = round(min(96.0, 24 + (multiplier * 15) + (Exam.objects.count() * 0.06)), 2)

    verdict = "pass"
    if error_rate >= 8 or p95_ms >= 1200:
        verdict = "fail"
    elif error_rate >= 3 or p95_ms >= 800:
        verdict = "warning"

    recommendations = []
    if p95_ms >= 800:
        recommendations.append("Increase worker concurrency and profile slow endpoints.")
    if error_rate >= 3:
        recommendations.append("Review retry policies and DB connection pool sizing.")
    if cpu_percent >= 80:
        recommendations.append("Scale API replicas or optimize heavy write paths.")
    if memory_percent >= 80:
        recommendations.append("Inspect memory pressure and tune cache/ORM query usage.")
    if not recommendations:
        recommendations.append("System is stable under this simulated load.")

    result = {
        "scenario": scenario,
        "executed_at": timezone.now().isoformat(),
        "virtual_users": config["virtual_users"],
        "total_requests": config["requests"],
        "metrics": {
            "p50_ms": p50_ms,
            "p95_ms": p95_ms,
            "error_rate_percent": error_rate,
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
        },
        "verdict": verdict,
        "recommendations": recommendations,
    }

    _set_setting("last_stress_test_report", result)
    create_god_mode_log(
        user,
        module="stress_test",
        level="warning" if verdict != "pass" else "success",
        message=f"Stress test scenario '{scenario}' executed",
        details={"verdict": verdict, "p95_ms": p95_ms, "error_rate_percent": error_rate},
    )

    return result


def list_bug_reports(user):
    create_god_mode_log(user, module="bug_reporter", level="info", message="Viewed bug reports")
    return GodModeBugReport.objects.select_related("reported_by", "assigned_to").order_by("-created_at")


def create_bug_report(user, payload):
    bug = GodModeBugReport.objects.create(
        title=payload["title"],
        module=payload["module"],
        severity=payload.get("severity", "medium"),
        steps_to_reproduce=payload["steps_to_reproduce"],
        reported_by=user,
    )
    create_god_mode_log(
        user,
        module="bug_reporter",
        level="warning",
        message=f"Bug report created: {bug.title}",
        details={"bug_id": str(bug.id), "severity": bug.severity},
    )
    return bug


def patch_bug_report(user, bug_id, payload):
    bug = GodModeBugReport.objects.filter(id=bug_id).first()
    if not bug:
        raise NotFound("Bug report not found.")

    if "status" in payload:
        bug.status = payload["status"]

    if "assigned_to" in payload:
        assignee_id = payload["assigned_to"]
        if assignee_id is None:
            bug.assigned_to = None
        else:
            assignee = CustomUser.objects.filter(id=assignee_id).first()
            if not assignee:
                raise ValidationError({"assigned_to": "Invalid assignee user id."})
            bug.assigned_to = assignee

    bug.save(update_fields=["status", "assigned_to", "updated_at"])
    create_god_mode_log(
        user,
        module="bug_reporter",
        level="info",
        message=f"Bug report updated: {bug.title}",
        details={"bug_id": str(bug.id), "status": bug.status},
    )
    return bug


def list_god_mode_settings(user):
    _ensure_god_mode_settings()
    create_god_mode_log(user, module="settings", level="info", message="Viewed God Mode settings")
    return GodModeSetting.objects.filter(key__in=list(GOD_MODE_SETTING_DEFAULTS.keys())).order_by("key")


def _apply_log_retention(days):
    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = GodModeLog.objects.filter(created_at__lt=cutoff).delete()
    return deleted


def _safe_mode_reset(user):
    _ensure_feature_toggles()
    reset_values = {}
    for key, meta in GOD_MODE_TOGGLE_DEFINITIONS.items():
        toggle = GodModeFeatureToggle.objects.filter(key=key).first()
        if toggle:
            toggle.is_enabled = meta["default"]
            toggle.updated_by = user
            toggle.save(update_fields=["is_enabled", "updated_by", "updated_at"])
            reset_values[key] = meta["default"]
    _set_setting("exam_simulation_state", {})
    return reset_values


def patch_god_mode_settings(user, payload):
    _ensure_god_mode_settings()
    changed = {}

    for key in ["theme", "auto_refresh_interval", "log_retention_days", "notification_sound"]:
        if key in payload:
            _set_setting(key, payload[key])
            changed[key] = payload[key]

    deleted_logs = None
    if "log_retention_days" in payload:
        deleted_logs = _apply_log_retention(int(payload["log_retention_days"]))

    reset_result = None
    if payload.get("safe_mode_reset"):
        reset_result = _safe_mode_reset(user)

    create_god_mode_log(
        user,
        module="settings",
        level="warning" if payload.get("safe_mode_reset") else "info",
        message="God Mode settings updated",
        details={
            "changed": changed,
            "safe_mode_reset": bool(payload.get("safe_mode_reset")),
            "deleted_logs": deleted_logs,
        },
    )

    return {
        "changed": changed,
        "deleted_logs": deleted_logs,
        "safe_mode_reset": bool(payload.get("safe_mode_reset")),
        "reset_toggles": reset_result,
    }


def simulate_notification_delivery(user, target_role="all", message=""):
    content = (message or "").strip() or "[GOD MODE TEST] This is a simulated platform notification."
    recipients_qs = CustomUser.objects.filter(is_active=True)
    if target_role != "all":
        recipients_qs = recipients_qs.filter(role=target_role)

    recipients = list(recipients_qs.order_by("created_at")[:100])
    delivered_to = []
    for recipient in recipients:
        Notification.objects.create(
            organization=recipient.organization,
            recipient=recipient,
            notif_type="exam_assigned",
            message=content,
        )
        delivered_to.append(recipient.email)

    result = {
        "target_role": target_role,
        "message": content,
        "delivered_count": len(delivered_to),
        "sample_recipients": delivered_to[:10],
        "timestamp": timezone.now().isoformat(),
    }

    create_god_mode_log(
        user,
        module="notification_simulator",
        level="success",
        message="Notification simulation executed",
        details={"target_role": target_role, "delivered_count": len(delivered_to)},
    )

    return result
