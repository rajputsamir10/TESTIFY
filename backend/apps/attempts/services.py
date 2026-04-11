import logging
import hashlib
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfdoc
from reportlab.pdfgen import canvas
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.attempts.execution import execute_code, score_from_execution_result
from apps.attempts.models import Answer, Attempt
from apps.exams.models import Exam
from apps.questions.models import MCQOption, Question
from apps.results.models import Result
from utils.email_utils import send_platform_email

logger = logging.getLogger(__name__)


def _md5_compat(*args, **kwargs):
    kwargs.pop("usedforsecurity", None)
    return hashlib.md5(*args, **kwargs)


def _require_student(user):
    role = getattr(user, "role", None)
    logger.debug(
        "Student endpoint role check: user_id=%s role=%s",
        getattr(user, "id", None),
        role,
    )
    if role != "student":
        raise PermissionDenied("Only students can access this endpoint.")


def list_question_options_for_student(user, question_id):
    _require_student(user)

    course_filter = Q(exam__course__isnull=True)
    if user.course_id:
        course_filter = course_filter | Q(exam__course_id=user.course_id)

    question = (
        Question.objects.prefetch_related("options")
        .filter(
            id=question_id,
            organization_id=user.organization_id,
            exam__department_id=user.department_id,
            exam__is_published=True,
        )
        .filter(course_filter)
        .first()
    )
    if not question:
        raise NotFound("Question not found.")

    return question.options.all().order_by("order")


def _effective_attempt_end_time(attempt: Attempt):
    duration_end_time = attempt.started_at + timedelta(minutes=attempt.exam.duration_minutes)
    return min(duration_end_time, attempt.exam.end_time)


def get_attempt_for_student(user, attempt_id):
    _require_student(user)
    attempt = Attempt.objects.select_related("exam").filter(
        id=attempt_id,
        student=user,
        organization_id=user.organization_id,
    ).first()
    if not attempt:
        raise NotFound("Attempt not found.")
    return attempt


def get_profile(user):
    _require_student(user)
    return user


def update_profile_photo(user, photo):
    _require_student(user)
    user.profile_photo = photo
    user.save(update_fields=["profile_photo"])
    return user


def list_available_exams(user):
    _require_student(user)

    now = timezone.now()
    if not user.organization or not user.organization.is_active:
        return Exam.objects.none()

    submitted_exam_ids = Attempt.objects.filter(
        student=user,
        status="submitted",
    ).values_list("exam_id", flat=True)

    course_filter = Q(course__isnull=True)
    if user.course_id:
        course_filter = course_filter | Q(course_id=user.course_id)

    return (
        Exam.objects.filter(
            organization_id=user.organization_id,
            department_id=user.department_id,
            is_published=True,
            end_time__gte=now,
        )
        .filter(course_filter)
        .exclude(id__in=submitted_exam_ids)
        .order_by("start_time")
    )


def start_exam(user, exam_id):
    _require_student(user)

    if not user.organization or not user.organization.is_active:
        raise ValidationError({"detail": "Organization is inactive."})

    course_filter = Q(course__isnull=True)
    if user.course_id:
        course_filter = course_filter | Q(course_id=user.course_id)

    exam = Exam.objects.filter(
        id=exam_id,
        organization_id=user.organization_id,
        department_id=user.department_id,
        is_published=True,
    ).filter(course_filter).first()
    if not exam:
        raise NotFound("Exam not found or not available.")

    now = timezone.now()
    if now < exam.start_time:
        raise ValidationError({"detail": "Exam has not started yet. Please wait until the scheduled time."})
    if now > exam.end_time:
        raise ValidationError({"detail": "Exam time window has ended."})

    if not exam.questions.exists():
        raise ValidationError({"detail": "Cannot start exam with 0 questions."})

    existing = Attempt.objects.filter(exam=exam, student=user).first()
    if existing and existing.status == "submitted":
        raise ValidationError({"detail": "Attempt already submitted for this exam."})

    if existing:
        if timezone.now() >= _effective_attempt_end_time(existing):
            auto_submit_attempt(user, existing.id, reason="timer_expiry")
            raise ValidationError({"detail": "Exam time is over. Attempt has been auto-submitted."})
        return existing

    attempt = Attempt.objects.create(
        organization_id=user.organization_id,
        exam=exam,
        student=user,
    )

    answers = [
        Answer(attempt=attempt, question=question)
        for question in exam.questions.order_by("order")
    ]
    Answer.objects.bulk_create(answers)

    return attempt


def get_remaining_seconds(user, attempt_id):
    attempt = get_attempt_for_student(user, attempt_id)

    effective_end_time = _effective_attempt_end_time(attempt)
    remaining = int((effective_end_time - timezone.now()).total_seconds())
    if remaining <= 0 and attempt.status == "in_progress":
        auto_submit_attempt(user, attempt.id, reason="timer_expiry")
    return max(remaining, 0)


def get_attempt_answers(user, attempt_id):
    attempt = get_attempt_for_student(user, attempt_id)

    return Answer.objects.filter(attempt=attempt).select_related("question", "selected_option")


def _get_answer(user, answer_id):
    answer = Answer.objects.select_related("attempt", "question").filter(
        id=answer_id,
        attempt__student=user,
        attempt__organization_id=user.organization_id,
    ).first()
    if not answer:
        raise NotFound("Answer not found.")
    return answer


def _validate_locked_language(payload, locked_language):
    if not isinstance(payload, dict):
        return

    provided = payload.get("coding_language")
    if provided is None:
        provided = payload.get("language")
    if provided is None:
        return

    normalized_provided = str(provided).strip().lower()
    normalized_locked = str(locked_language or "").strip().lower()

    if normalized_provided != normalized_locked:
        raise ValidationError(
            {
                "coding_language": (
                    f'Language is locked by teacher to "{locked_language}".'
                )
            }
        )


def update_answer(user, answer_id, payload):
    _require_student(user)

    answer = _get_answer(user, answer_id)

    if answer.attempt.status != "in_progress":
        raise ValidationError({"detail": "Attempt already submitted."})

    if timezone.now() >= _effective_attempt_end_time(answer.attempt):
        auto_submit_attempt(user, answer.attempt_id, reason="timer_expiry")
        raise ValidationError({"detail": "Exam time is over. Attempt has been auto-submitted."})

    if answer.question.question_type == "mcq":
        selected_option_id = payload.get("selected_option")
        if selected_option_id:
            option = MCQOption.objects.filter(
                id=selected_option_id,
                question_id=answer.question_id,
            ).first()
            if not option:
                raise ValidationError({"selected_option": "Invalid option for question."})
            answer.selected_option = option
            answer.text_answer = None
            answer.code_answer = None
            answer.execution_result = {}
        else:
            answer.selected_option = None
    elif answer.question.question_type == "subjective":
        answer.text_answer = payload.get("text_answer")
        answer.selected_option = None
        answer.code_answer = None
        answer.execution_result = {}
    else:
        _validate_locked_language(payload, answer.question.coding_language)

        source_code = payload.get("code_answer")
        if source_code is not None:
            if str(source_code) != str(answer.code_answer or ""):
                answer.execution_result = {}
            answer.code_answer = str(source_code)
        answer.selected_option = None
        answer.text_answer = None

    answer.save(
        update_fields=[
            "selected_option",
            "text_answer",
            "code_answer",
            "execution_result",
            "updated_at",
        ]
    )
    return answer


def run_coding_answer(user, answer_id, payload):
    _require_student(user)

    answer = _get_answer(user, answer_id)

    if answer.question.question_type not in ("coding", "dsa"):
        raise ValidationError({"detail": "Run code is only for coding or DSA questions."})

    language = answer.question.coding_language
    _validate_locked_language(payload, language)

    if language == "html":
        raise ValidationError({"detail": "HTML/CSS is rendered in the browser. Use the preview panel."})

    if answer.attempt.status != "in_progress":
        raise ValidationError({"detail": "Attempt already submitted."})

    if timezone.now() >= _effective_attempt_end_time(answer.attempt):
        auto_submit_attempt(user, answer.attempt_id, reason="timer_expiry")
        raise ValidationError({"detail": "Exam time is over. Attempt has been auto-submitted."})

    source_code = payload.get("code_answer") if isinstance(payload, dict) else None
    if source_code is None:
        source_code = answer.code_answer

    result = execute_code(
        language=language,
        source=source_code or "",
        test_cases=answer.question.sample_test_cases,
        timeout=max(1, int(answer.question.time_limit_seconds or 3)),
        memory_limit_mb=max(32, int(answer.question.memory_limit_mb or 256)),
    )

    answer.code_answer = source_code
    answer.execution_result = result
    answer.save(update_fields=["code_answer", "execution_result", "updated_at"])

    return {"answer_id": str(answer.id), "result": result}


def _score_coding_answer(answer: Answer) -> Decimal:
    question = answer.question
    language = question.coding_language

    if language == "html":
        answer.is_evaluated = False
        answer.execution_result = {
            "language": "html",
            "passed_count": 0,
            "total_cases": 0,
            "ratio": "0",
            "case_results": [],
            "detail": "HTML/CSS answers require manual teacher evaluation.",
        }
        return Decimal("0.00")

    if question.question_type == "dsa":
        test_cases = question.hidden_test_cases or question.sample_test_cases
    else:
        test_cases = question.sample_test_cases

    try:
        result = execute_code(
            language=language,
            source=answer.code_answer or "",
            test_cases=test_cases,
            timeout=max(1, int(question.time_limit_seconds or 3)),
            memory_limit_mb=max(32, int(question.memory_limit_mb or 256)),
        )
    except Exception as exc:
        logger.warning("Execution error for answer=%s: %s", answer.id, exc)
        result = {
            "language": language,
            "passed_count": 0,
            "total_cases": len(test_cases or []),
            "ratio": "0",
            "case_results": [],
            "error": str(exc),
        }

    if question.question_type == "dsa":
        # Never expose hidden test case input/output through stored attempt payloads.
        answer.execution_result = {
            "language": language,
            "passed_count": result.get("passed_count", 0),
            "total_cases": result.get("total_cases", 0),
            "ratio": result.get("ratio", "0"),
            "case_results": [],
            "detail": "Evaluated on hidden test cases.",
        }
    else:
        answer.execution_result = result
    answer.is_evaluated = True
    return score_from_execution_result(result, question.marks)


def _calculate_mcq_marks(answer: Answer) -> Decimal:
    question = answer.question
    if answer.selected_option is None:
        return Decimal("0.00")
    if answer.selected_option.is_correct:
        return question.marks
    # Spec requires per-question floor at 0.
    return max(Decimal("0.00"), Decimal("0.00") - question.negative_marks)


def _upsert_result_for_attempt(attempt: Attempt):
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
            "is_published": False,
        },
    )

    result.total_marks = exam.total_marks
    result.marks_obtained = total_obtained
    result.percentage = percentage
    result.is_passed = total_obtained >= exam.pass_marks
    result.save()
    return result


def _send_submission_email(attempt: Attempt, result: Result, auto: bool, reason: str):
    mode = "auto-submitted" if auto else "submitted"
    reason_line = f"Reason: {reason}.\n" if auto and reason else ""

    send_platform_email(
        attempt.student.email,
        f"Testify exam {mode}: {attempt.exam.title}",
        (
            f"Hi {attempt.student.full_name},\n\n"
            f"Your exam '{attempt.exam.title}' has been {mode}.\n"
            f"Marks obtained: {result.marks_obtained}/{result.total_marks}\n"
            f"Percentage: {result.percentage}\n"
            f"Status: {'Pass' if result.is_passed else 'Fail'}\n"
            f"{reason_line}\n"
            "- Testify"
        ),
    )


def submit_attempt(user, attempt_id, auto=False, reason="manual"):
    _require_student(user)

    attempt = get_attempt_for_student(user, attempt_id)

    if attempt.status == "submitted":
        if auto:
            return attempt
        raise ValidationError({"detail": "Attempt already submitted."})

    answers = Answer.objects.select_related("question", "selected_option").filter(attempt=attempt)
    for answer in answers:
        question_type = answer.question.question_type

        if question_type == "mcq":
            answer.marks_awarded = _calculate_mcq_marks(answer)
            answer.is_evaluated = True
            answer.execution_result = {}
        elif question_type == "subjective":
            answer.marks_awarded = answer.marks_awarded or Decimal("0.00")
            answer.is_evaluated = False
            answer.execution_result = {}
        elif question_type in ("coding", "dsa"):
            answer.marks_awarded = _score_coding_answer(answer)
        else:
            answer.marks_awarded = answer.marks_awarded or Decimal("0.00")
            answer.is_evaluated = False

        answer.save(
            update_fields=[
                "marks_awarded",
                "is_evaluated",
                "execution_result",
                "updated_at",
            ]
        )

    attempt.status = "submitted"
    attempt.submitted_at = timezone.now()
    attempt.is_auto_submitted = auto
    attempt.save(update_fields=["status", "submitted_at", "is_auto_submitted"])

    logger.info("Exam submitted: attempt=%s auto=%s reason=%s", attempt.id, auto, reason)
    result = _upsert_result_for_attempt(attempt)
    _send_submission_email(attempt, result, auto=auto, reason=reason)
    return attempt


def auto_submit_attempt(user, attempt_id, reason="timer_expiry"):
    return submit_attempt(user, attempt_id, auto=True, reason=reason)


def record_violation(user, attempt_id, attempt=None):
    _require_student(user)
    target_attempt = attempt or get_attempt_for_student(user, attempt_id)

    if target_attempt.status == "submitted":
        return {"violation_count": target_attempt.violation_count, "auto_submitted": False}

    target_attempt.violation_count += 1
    target_attempt.save(update_fields=["violation_count"])
    logger.warning(
        "Violation recorded: attempt=%s count=%s",
        target_attempt.id,
        target_attempt.violation_count,
    )

    auto_submitted = False
    if target_attempt.violation_count >= 2:
        auto_submit_attempt(user, target_attempt.id, reason="tab_or_proctoring_violation")
        auto_submitted = True

    return {"violation_count": target_attempt.violation_count, "auto_submitted": auto_submitted}


def list_results(user):
    _require_student(user)
    return Result.objects.filter(
        student=user,
        organization_id=user.organization_id,
        is_published=True,
    ).select_related("exam", "attempt")


def get_result(user, result_id):
    _require_student(user)
    result = Result.objects.select_related("exam", "attempt").filter(
        id=result_id,
        student=user,
        organization_id=user.organization_id,
        is_published=True,
    ).first()
    if not result:
        raise NotFound("Result not found.")
    return result


def get_result_review(user, result_id):
    result = get_result(user, result_id)
    if not result.exam.allow_review:
        raise PermissionDenied("Review is disabled for this exam.")

    answers = Answer.objects.filter(attempt=result.attempt).select_related("question", "selected_option")
    return result, answers


def download_result(user, result_id, fmt: str):
    result, answers = get_result_review(user, result_id)

    if fmt == "excel":
        return _build_excel_response(result, answers)
    if fmt == "pdf":
        return _build_pdf_response(result, answers)

    raise ValidationError({"format": "format must be pdf or excel."})


def _build_excel_response(result, answers):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Result"

    sheet.append(["Exam", result.exam.title])
    sheet.append(["Student", result.student.full_name])
    sheet.append(["Total Marks", float(result.total_marks)])
    sheet.append(["Marks Obtained", float(result.marks_obtained)])
    sheet.append(["Percentage", float(result.percentage)])
    sheet.append([])
    sheet.append(["Question", "Type", "Selected/Text", "Marks Awarded"])

    for answer in answers:
        if answer.question.question_type in ("coding", "dsa"):
            value = answer.code_answer or ""
        else:
            value = answer.text_answer or (answer.selected_option.option_text if answer.selected_option else "")
        sheet.append(
            [
                answer.question.question_text,
                answer.question.question_type,
                value,
                float(answer.marks_awarded),
            ]
        )

    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)

    response = HttpResponse(
        stream.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="result_{result.id}.xlsx"'
    return response


def _build_pdf_response(result, answers):
    pdfdoc.md5 = _md5_compat

    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4)

    y = 810
    line_height = 16

    def draw_line(text):
        nonlocal y
        if y < 50:
            pdf.showPage()
            y = 810
        pdf.drawString(40, y, text)
        y -= line_height

    draw_line("TESTIFY RESULT REPORT")
    draw_line(f"Exam: {result.exam.title}")
    draw_line(f"Student: {result.student.full_name}")
    draw_line(f"Total Marks: {result.total_marks}")
    draw_line(f"Marks Obtained: {result.marks_obtained}")
    draw_line(f"Percentage: {result.percentage}")
    draw_line("")
    draw_line("Answers:")

    for answer in answers:
        if answer.question.question_type in ("coding", "dsa"):
            value = answer.code_answer or ""
        else:
            value = answer.text_answer or (answer.selected_option.option_text if answer.selected_option else "")
        draw_line(f"Q: {answer.question.question_text[:90]}")
        draw_line(f"Type: {answer.question.question_type}")
        draw_line(f"Answer: {value[:100]}")
        draw_line(f"Marks Awarded: {answer.marks_awarded}")
        draw_line("")

    pdf.save()
    stream.seek(0)

    response = HttpResponse(stream.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="result_{result.id}.pdf"'
    return response
