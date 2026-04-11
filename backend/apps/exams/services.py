import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.attempts.models import Answer, Attempt
from apps.departments.models import Course, Department
from apps.exams.models import Exam
from apps.notifications.models import Notification
from apps.questions.models import MCQOption, Question
from apps.results.models import Result
from utils.email_utils import send_platform_email
from utils.plan_limits import ensure_exam_limit

logger = logging.getLogger(__name__)


def _can_manage_teacher_scope(user):
    if user.role not in ["teacher", "admin", "god"]:
        raise PermissionDenied("Only teacher/admin can access this endpoint.")


def _require_teacher(user):
    if user.role != "teacher":
        raise PermissionDenied("Only teacher can access this endpoint.")


def _base_exam_queryset(user):
    qs = Exam.objects.select_related("department", "course", "created_by", "organization")
    if user.role != "god":
        qs = qs.filter(organization_id=user.organization_id)
    if user.role == "teacher":
        qs = qs.filter(department_id=user.department_id)
    return qs


def _base_attempt_queryset(user):
    qs = Attempt.objects.select_related("exam", "student", "organization")
    if user.role != "god":
        qs = qs.filter(organization_id=user.organization_id)
    if user.role == "teacher":
        qs = qs.filter(exam__department_id=user.department_id)
    return qs


def _recalculate_exam_total_marks(exam: Exam):
    total_marks = exam.questions.aggregate(total=Sum("marks"))["total"] or Decimal("0.00")
    exam.total_marks = total_marks
    exam.save(update_fields=["total_marks", "updated_at"])


def _ensure_exam_editable_for_teacher(user, exam: Exam):
    if user.role != "teacher":
        return

    if Attempt.objects.filter(exam=exam).exists():
        raise ValidationError({"detail": "Times up exam is already Started by the Students "})


def list_exams(user):
    _can_manage_teacher_scope(user)
    return _base_exam_queryset(user).order_by("-created_at")


def list_teacher_departments(user):
    _require_teacher(user)
    departments = Department.objects.filter(organization_id=user.organization_id).order_by("name")
    if user.department_id:
        departments = departments.filter(id=user.department_id)
    return departments


def list_teacher_courses(user, department_id=None):
    _require_teacher(user)
    courses = Course.objects.filter(organization_id=user.organization_id).select_related("department")
    if user.department_id:
        courses = courses.filter(department_id=user.department_id)
    if department_id:
        courses = courses.filter(department_id=department_id)
    return courses.order_by("name")


def get_teacher_profile(user):
    _require_teacher(user)
    return user


def update_teacher_profile_photo(user, photo):
    _require_teacher(user)
    user.profile_photo = photo
    user.save(update_fields=["profile_photo"])
    return user


def create_exam(user, payload):
    _can_manage_teacher_scope(user)
    if user.role == "teacher" and not user.department_id:
        raise ValidationError({"department": "Teacher must be assigned to a department."})

    organization = user.organization
    if user.role == "god":
        raise ValidationError({"detail": "Use god endpoints to manage exams globally."})

    department_value = payload.get("department")
    dept_id = getattr(department_value, "id", department_value) or user.department_id
    department = Department.objects.filter(id=dept_id, organization=organization).first()
    if not department:
        raise ValidationError({"department": "Invalid department for this organization."})

    course = None
    course_value = payload.get("course")
    course_id = getattr(course_value, "id", course_value)
    if course_id:
        course = Course.objects.filter(
            id=course_id,
            organization=organization,
            department=department,
        ).first()
        if not course:
            raise ValidationError({"course": "Invalid course for selected department."})

    if user.role != "god":
        exam_count = Exam.objects.filter(organization=organization).count()
        ensure_exam_limit(organization, exam_count)

    if payload["start_time"] >= payload["end_time"]:
        raise ValidationError({"end_time": "end_time must be after start_time."})

    exam = Exam.objects.create(
        organization=organization,
        department=department,
        course=course,
        created_by=user,
        title=payload["title"],
        description=payload.get("description", ""),
        pass_marks=payload["pass_marks"],
        duration_minutes=payload["duration_minutes"],
        start_time=payload["start_time"],
        end_time=payload["end_time"],
        shuffle_questions=payload.get("shuffle_questions", False),
        allow_review=payload.get("allow_review", True),
    )
    return exam


def update_exam(user, exam_id, payload):
    _can_manage_teacher_scope(user)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise NotFound("Exam not found.")

    _ensure_exam_editable_for_teacher(user, exam)

    updatable_fields = [
        "title",
        "description",
        "pass_marks",
        "duration_minutes",
        "start_time",
        "end_time",
        "shuffle_questions",
        "allow_review",
    ]
    for field in updatable_fields:
        if field in payload:
            setattr(exam, field, payload[field])

    if "department" in payload:
        department = Department.objects.filter(
            id=payload["department"], organization_id=exam.organization_id
        ).first()
        if not department:
            raise ValidationError({"department": "Invalid department."})
        exam.department = department

    if "course" in payload:
        course_value = payload.get("course")
        course_id = getattr(course_value, "id", course_value)
        if course_id in [None, "", "null"]:
            exam.course = None
        else:
            course = Course.objects.filter(
                id=course_id,
                organization_id=exam.organization_id,
                department_id=exam.department_id,
            ).first()
            if not course:
                raise ValidationError({"course": "Invalid course for selected department."})
            exam.course = course
    elif "department" in payload and exam.course_id and exam.course.department_id != exam.department_id:
        exam.course = None

    if exam.start_time >= exam.end_time:
        raise ValidationError({"end_time": "end_time must be after start_time."})

    exam.save()
    return exam


def delete_exam(user, exam_id):
    _can_manage_teacher_scope(user)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise NotFound("Exam not found.")
    _ensure_exam_editable_for_teacher(user, exam)
    exam.delete()


def publish_exam(user, exam_id):
    _can_manage_teacher_scope(user)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise NotFound("Exam not found.")

    if not exam.questions.exists():
        raise ValidationError({"detail": "Cannot publish exam with 0 questions."})

    _recalculate_exam_total_marks(exam)
    exam.is_published = True
    exam.save(update_fields=["is_published", "updated_at"])
    return exam


def list_exam_questions(user, exam_id):
    _can_manage_teacher_scope(user)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise NotFound("Exam not found.")
    return exam.questions.prefetch_related("options").order_by("order")


def create_question(user, payload):
    _can_manage_teacher_scope(user)

    exam_value = payload.get("exam")
    exam_id = getattr(exam_value, "id", exam_value)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise ValidationError({"exam": "Invalid exam."})

    _ensure_exam_editable_for_teacher(user, exam)

    if user.role == "teacher" and exam.is_published:
        raise ValidationError({"detail": "Times up exam is already Started by the Students "})

    with transaction.atomic():
        question_type = payload.get("question_type", "mcq")
        negative_marks = payload.get("negative_marks", Decimal("0.00"))
        if question_type != "mcq":
            negative_marks = Decimal("0.00")

        coding_language = payload.get("coding_language")
        if question_type not in ("coding", "dsa"):
            coding_language = None

        hidden_test_cases = payload.get("hidden_test_cases", [])
        if question_type != "dsa":
            hidden_test_cases = []

        question = Question.objects.create(
            exam=exam,
            organization=exam.organization,
            question_text=payload["question_text"],
            question_type=question_type,
            problem_statement=payload.get("problem_statement", None),
            input_format=payload.get("input_format", None),
            output_format=payload.get("output_format", None),
            constraints=payload.get("constraints", None),
            sample_test_cases=payload.get("sample_test_cases", []),
            hidden_test_cases=hidden_test_cases,
            time_limit_seconds=payload.get("time_limit_seconds", 3),
            memory_limit_mb=payload.get("memory_limit_mb", 256),
            coding_language=coding_language,
            marks=payload["marks"],
            negative_marks=negative_marks,
            image=payload.get("image"),
            order=payload.get("order", 0),
        )

        options = payload.get("options", [])
        if question.question_type == "mcq":
            if not options:
                raise ValidationError({"options": "MCQ question requires options."})
            correct_count = sum(1 for option in options if option.get("is_correct"))
            if correct_count != 1:
                raise ValidationError({"options": "MCQ must have exactly one correct option."})
            for idx, option in enumerate(options):
                MCQOption.objects.create(
                    question=question,
                    option_text=option["option_text"],
                    is_correct=option.get("is_correct", False),
                    order=option.get("order", idx),
                )

    _recalculate_exam_total_marks(exam)
    return question


def update_question(user, question_id, payload):
    _can_manage_teacher_scope(user)

    question_qs = Question.objects.select_related("exam", "organization")
    if user.role != "god":
        question_qs = question_qs.filter(organization_id=user.organization_id)
    if user.role == "teacher":
        question_qs = question_qs.filter(exam__department_id=user.department_id)

    question = question_qs.filter(id=question_id).first()
    if not question:
        raise NotFound("Question not found.")

    _ensure_exam_editable_for_teacher(user, question.exam)

    if question.exam.is_published and user.role == "teacher":
        raise ValidationError({"detail": "Times up exam is already Started by the Students "})

    for field in [
        "question_text",
        "marks",
        "negative_marks",
        "order",
        "image",
        "problem_statement",
        "input_format",
        "output_format",
        "constraints",
        "sample_test_cases",
        "hidden_test_cases",
        "time_limit_seconds",
        "memory_limit_mb",
        "coding_language",
    ]:
        if field in payload:
            setattr(question, field, payload[field])

    if "question_type" in payload:
        question.question_type = payload["question_type"]

    if question.question_type != "mcq":
        question.negative_marks = Decimal("0.00")

    if question.question_type not in ("coding", "dsa"):
        question.coding_language = None
        question.problem_statement = None
        question.input_format = None
        question.output_format = None
        question.constraints = None
        question.sample_test_cases = []
        question.hidden_test_cases = []
        question.time_limit_seconds = 3
        question.memory_limit_mb = 256

    if question.question_type != "dsa":
        question.hidden_test_cases = []

    question.save()

    if "options" in payload:
        options = payload["options"]
        if question.question_type != "mcq":
            raise ValidationError({"options": "Options are allowed only for mcq type questions."})
        correct_count = sum(1 for option in options if option.get("is_correct"))
        if correct_count != 1:
            raise ValidationError({"options": "MCQ must have exactly one correct option."})

        question.options.all().delete()
        for idx, option in enumerate(options):
            MCQOption.objects.create(
                question=question,
                option_text=option["option_text"],
                is_correct=option.get("is_correct", False),
                order=option.get("order", idx),
            )
    elif question.question_type != "mcq":
        question.options.all().delete()

    _recalculate_exam_total_marks(question.exam)
    return question


def delete_question(user, question_id):
    _can_manage_teacher_scope(user)

    question_qs = Question.objects.select_related("exam")
    if user.role != "god":
        question_qs = question_qs.filter(organization_id=user.organization_id)
    if user.role == "teacher":
        question_qs = question_qs.filter(exam__department_id=user.department_id)

    question = question_qs.filter(id=question_id).first()
    if not question:
        raise NotFound("Question not found.")

    _ensure_exam_editable_for_teacher(user, question.exam)

    if question.exam.is_published and user.role == "teacher":
        raise ValidationError({"detail": "Times up exam is already Started by the Students "})

    exam = question.exam
    question.delete()
    _recalculate_exam_total_marks(exam)


def list_exam_attempts(user, exam_id):
    _can_manage_teacher_scope(user)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise NotFound("Exam not found.")
    return _base_attempt_queryset(user).filter(exam=exam).order_by("-started_at")


def list_attempt_answers(user, attempt_id):
    _can_manage_teacher_scope(user)
    attempt = _base_attempt_queryset(user).filter(id=attempt_id).first()
    if not attempt:
        raise NotFound("Attempt not found.")
    return Answer.objects.filter(attempt=attempt).select_related("question", "selected_option")


def _recalculate_attempt_result(attempt: Attempt, evaluator):
    total_obtained = attempt.answers.aggregate(total=Sum("marks_awarded"))["total"] or Decimal("0.00")
    exam = attempt.exam
    percentage = Decimal("0.00")
    if exam.total_marks and exam.total_marks > 0:
        percentage = (Decimal(total_obtained) / Decimal(exam.total_marks)) * Decimal("100")

    result, _ = Result.objects.get_or_create(
        attempt=attempt,
        defaults={
            "organization": attempt.organization,
            "student": attempt.student,
            "exam": exam,
            "total_marks": exam.total_marks,
            "marks_obtained": total_obtained,
            "percentage": percentage,
            "is_passed": total_obtained >= exam.pass_marks,
            "evaluated_by": evaluator,
        },
    )
    result.total_marks = exam.total_marks
    result.marks_obtained = total_obtained
    result.percentage = percentage
    result.is_passed = total_obtained >= exam.pass_marks
    result.evaluated_by = evaluator
    result.save()


def evaluate_answer(user, answer_id, marks_awarded):
    _can_manage_teacher_scope(user)

    answers = Answer.objects.select_related("attempt", "question", "attempt__exam")
    if user.role != "god":
        answers = answers.filter(attempt__organization_id=user.organization_id)
    if user.role == "teacher":
        answers = answers.filter(attempt__exam__department_id=user.department_id)

    answer = answers.filter(id=answer_id).first()
    if not answer:
        raise NotFound("Answer not found.")

    requires_manual_evaluation = answer.question.question_type == "subjective" or (
        answer.question.question_type in ("coding", "dsa")
        and answer.question.coding_language == "html"
    )
    if not requires_manual_evaluation:
        raise ValidationError({"detail": "Only subjective and HTML answers can be manually evaluated."})

    if marks_awarded < 0 or marks_awarded > answer.question.marks:
        raise ValidationError({"marks_awarded": "marks_awarded must be between 0 and question marks."})

    answer.marks_awarded = marks_awarded
    answer.is_evaluated = True
    answer.save(update_fields=["marks_awarded", "is_evaluated", "updated_at"])

    manual_answers = Answer.objects.filter(attempt=answer.attempt).filter(
        Q(question__question_type="subjective")
        | Q(question__question_type__in=("coding", "dsa"), question__coding_language="html")
    )
    if manual_answers.exists() and not manual_answers.filter(is_evaluated=False).exists():
        _recalculate_attempt_result(answer.attempt, user)

    return answer


def publish_results(user, exam_id):
    _can_manage_teacher_scope(user)
    exam = _base_exam_queryset(user).filter(id=exam_id).first()
    if not exam:
        raise NotFound("Exam not found.")

    now = timezone.now()
    results = Result.objects.filter(exam=exam)
    updated = 0
    for result in results:
        result.is_published = True
        result.published_at = now
        result.save(update_fields=["is_published", "published_at"])
        Notification.objects.create(
            organization=result.organization,
            recipient=result.student,
            notif_type="result_published",
            message=f"Your result for exam '{exam.title}' has been published.",
        )
        send_platform_email(
            result.student.email,
            f"Testify result published: {exam.title}",
            (
                f"Hi {result.student.full_name},\n\n"
                f"Your result for exam '{exam.title}' has been published.\n"
                f"Marks obtained: {result.marks_obtained}/{result.total_marks}\n"
                f"Percentage: {result.percentage}\n"
                f"Status: {'Pass' if result.is_passed else 'Fail'}\n\n"
                "Please log in to view complete details.\n\n"
                "- Testify"
            ),
        )
        updated += 1

    return {"updated": updated}


def students_performance(user):
    _can_manage_teacher_scope(user)
    results = Result.objects.select_related("student", "exam")
    if user.role != "god":
        results = results.filter(organization_id=user.organization_id)
    if user.role == "teacher":
        results = results.filter(exam__department_id=user.department_id)

    data = (
        results.values("student_id", "student__full_name")
        .annotate(
            exams_count=Count("id"),
            avg_percentage=Avg("percentage"),
            passed=Count("id", filter=None),
        )
        .order_by("-avg_percentage")
    )
    return data
