import logging
import hashlib
import json
import re
from difflib import SequenceMatcher
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

import requests
from django.conf import settings
from django.db.models import Q, Sum
from django.db.models import Avg
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfdoc
from reportlab.pdfgen import canvas
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.attempts.execution import execute_code, score_from_execution_result
from apps.attempts.models import (
    Answer,
    Attempt,
    PlaygroundAnswer,
    PlaygroundQuestion,
    PlaygroundSession,
)
from apps.exams.models import Exam
from apps.questions.models import MCQOption, Question
from apps.results.models import Result
from utils.email_utils import send_platform_email

logger = logging.getLogger(__name__)

PLAYGROUND_QUESTION_TYPES = {"mcq", "subjective", "coding", "dsa"}
PLAYGROUND_EXECUTABLE_LANGUAGES = {"python", "javascript", "java", "c", "cpp"}
PLAYGROUND_REQUIRED_TYPES = {"mcq", "subjective", "coding", "dsa"}


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


def _require_playground_enrollment(user):
    _require_student(user)
    if not user.organization_id or not user.department_id or not user.course_id:
        raise ValidationError(
            {
                "detail": (
                    "Playground is available only for students enrolled in both "
                    "a department and a course."
                )
            }
        )


def _extract_json_payload(text):
    raw_text = str(text or "").strip()
    if not raw_text:
        raise ValidationError({"detail": "Gemini returned an empty response."})

    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_text, re.IGNORECASE | re.DOTALL)
    if fenced:
        raw_text = fenced.group(1).strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValidationError(
            {"detail": "Gemini returned invalid JSON for playground questions."}
        ) from exc


def _clean_playground_test_cases(raw_cases, limit=8):
    if not isinstance(raw_cases, list):
        return []

    cleaned = []
    for case in raw_cases:
        if not isinstance(case, dict):
            continue
        expected_output = str(case.get("output", "")).strip()
        if not expected_output:
            continue

        cleaned.append(
            {
                "input": str(case.get("input", ""))[:10000],
                "output": expected_output[:10000],
            }
        )
        if len(cleaned) >= limit:
            break

    return cleaned


def _normalize_single_playground_question(item):
    if not isinstance(item, dict):
        return None

    question_type = str(item.get("question_type", "mcq")).strip().lower()
    if question_type not in PLAYGROUND_QUESTION_TYPES:
        question_type = "mcq"

    question_text = str(item.get("question_text", "")).strip()
    explanation = str(item.get("explanation", "")).strip()
    if not question_text:
        return None

    base_payload = {
        "question_type": question_type,
        "question_text": question_text,
        "options": [],
        "correct_option_index": None,
        "expected_answer": "",
        "coding_language": "",
        "problem_statement": "",
        "input_format": "",
        "output_format": "",
        "constraints": "",
        "sample_test_cases": [],
        "hidden_test_cases": [],
        "explanation": explanation,
    }

    if question_type == "mcq":
        options = item.get("options")
        if not isinstance(options, list):
            return None

        cleaned_options = [str(option).strip() for option in options if str(option).strip()]
        if len(cleaned_options) < 4:
            return None
        cleaned_options = cleaned_options[:4]

        try:
            correct_option_index = int(item.get("correct_option_index", 0))
        except (TypeError, ValueError):
            correct_option_index = 0

        if correct_option_index < 0 or correct_option_index >= len(cleaned_options):
            correct_option_index = 0

        base_payload["options"] = cleaned_options
        base_payload["correct_option_index"] = correct_option_index
        return base_payload

    if question_type == "subjective":
        expected_answer = str(item.get("expected_answer", "")).strip()
        if not expected_answer:
            return None

        base_payload["expected_answer"] = expected_answer
        return base_payload

    coding_language = str(item.get("coding_language", "python")).strip().lower()
    if coding_language not in PLAYGROUND_EXECUTABLE_LANGUAGES:
        coding_language = "python"

    problem_statement = str(item.get("problem_statement") or question_text).strip()
    input_format = str(item.get("input_format", "")).strip()
    output_format = str(item.get("output_format", "")).strip()
    constraints = str(item.get("constraints", "")).strip()
    sample_test_cases = _clean_playground_test_cases(item.get("sample_test_cases"), limit=8)
    hidden_test_cases = _clean_playground_test_cases(item.get("hidden_test_cases"), limit=12)

    if not problem_statement or not sample_test_cases:
        return None

    if question_type == "dsa" and not hidden_test_cases:
        hidden_test_cases = list(sample_test_cases)

    base_payload.update(
        {
            "coding_language": coding_language,
            "problem_statement": problem_statement,
            "input_format": input_format,
            "output_format": output_format,
            "constraints": constraints,
            "sample_test_cases": sample_test_cases,
            "hidden_test_cases": hidden_test_cases if question_type == "dsa" else [],
        }
    )
    return base_payload


def _build_fallback_playground_question(question_type, topic):
    safe_topic = str(topic or "general concepts").strip() or "general concepts"

    if question_type == "mcq":
        return {
            "question_type": "mcq",
            "question_text": f"Which statement best matches the topic \"{safe_topic}\"?",
            "options": [
                f"Core principles of {safe_topic} should guide the approach.",
                "Random guessing usually gives the best outcome.",
                "The topic is unrelated to learning objectives.",
                "Skipping fundamentals is always recommended.",
            ],
            "correct_option_index": 0,
            "expected_answer": "",
            "coding_language": "",
            "problem_statement": "",
            "input_format": "",
            "output_format": "",
            "constraints": "",
            "sample_test_cases": [],
            "hidden_test_cases": [],
            "explanation": "The correct option emphasizes conceptual understanding.",
        }

    if question_type == "subjective":
        return {
            "question_type": "subjective",
            "question_text": f"In 4-6 lines, explain the most important idea in \"{safe_topic}\".",
            "options": [],
            "correct_option_index": None,
            "expected_answer": (
                f"A strong answer should define {safe_topic}, mention one practical use case, "
                "and explain why the concept matters."
            ),
            "coding_language": "",
            "problem_statement": "",
            "input_format": "",
            "output_format": "",
            "constraints": "",
            "sample_test_cases": [],
            "hidden_test_cases": [],
            "explanation": "Look for concept clarity, relevance, and correct terminology.",
        }

    if question_type == "coding":
        return {
            "question_type": "coding",
            "question_text": f"Coding task related to {safe_topic}",
            "options": [],
            "correct_option_index": None,
            "expected_answer": "",
            "coding_language": "python",
            "problem_statement": (
                "Read one line of input and print the exact same line. "
                "This checks stdin/stdout handling."
            ),
            "input_format": "A single line string S.",
            "output_format": "Print S exactly as received.",
            "constraints": "1 <= len(S) <= 1000",
            "sample_test_cases": [
                {"input": "hello", "output": "hello"},
                {"input": "testify", "output": "testify"},
            ],
            "hidden_test_cases": [],
            "explanation": "Any correct echo solution should pass all sample cases.",
        }

    return {
        "question_type": "dsa",
        "question_text": f"DSA task related to {safe_topic}",
        "options": [],
        "correct_option_index": None,
        "expected_answer": "",
        "coding_language": "python",
        "problem_statement": "Given N integers, output their sum.",
        "input_format": "Line 1: integer N. Line 2: N space-separated integers.",
        "output_format": "Print one integer: the sum of all N numbers.",
        "constraints": "1 <= N <= 100000",
        "sample_test_cases": [
            {"input": "5\n1 2 3 4 5", "output": "15"},
            {"input": "3\n10 20 30", "output": "60"},
        ],
        "hidden_test_cases": [
            {"input": "4\n-1 2 -3 4", "output": "2"},
            {"input": "1\n999", "output": "999"},
        ],
        "explanation": "Use linear traversal and accumulate in an integer variable.",
    }


def _ensure_playground_type_coverage(rows, requested_count, topic, selected_question_type="mixed"):
    normalized_type = str(selected_question_type or "mixed").strip().lower()

    if normalized_type in PLAYGROUND_REQUIRED_TYPES:
        matching_items = [
            row
            for row in list(rows[:requested_count])
            if row.get("question_type", "mcq") == normalized_type
        ]
        while len(matching_items) < requested_count:
            matching_items.append(_build_fallback_playground_question(normalized_type, topic))
        return matching_items[:requested_count]

    if requested_count < len(PLAYGROUND_REQUIRED_TYPES):
        items = list(rows[:requested_count])
        while len(items) < requested_count:
            items.append(_build_fallback_playground_question("mcq", topic))
        return items

    items = list(rows[:requested_count])
    type_counts = {}
    for row in items:
        row_type = row.get("question_type", "mcq")
        type_counts[row_type] = type_counts.get(row_type, 0) + 1

    existing_types = set(type_counts.keys())
    missing_types = [t for t in sorted(PLAYGROUND_REQUIRED_TYPES) if t not in existing_types]
    if not missing_types:
        return items

    for missing_type in missing_types:
        fallback = _build_fallback_playground_question(missing_type, topic)

        replacement_index = None
        for idx in range(len(items) - 1, -1, -1):
            row_type = items[idx].get("question_type", "mcq")
            if type_counts.get(row_type, 0) > 1:
                replacement_index = idx
                type_counts[row_type] -= 1
                break

        if replacement_index is None:
            if len(items) < requested_count:
                items.append(fallback)
                type_counts[missing_type] = type_counts.get(missing_type, 0) + 1
                continue
            replacement_index = len(items) - 1
            replaced_type = items[replacement_index].get("question_type", "mcq")
            type_counts[replaced_type] = max(0, type_counts.get(replaced_type, 0) - 1)

        items[replacement_index] = fallback
        type_counts[missing_type] = type_counts.get(missing_type, 0) + 1

    preferred_cycle = ["mcq", "subjective", "coding", "dsa"]
    while len(items) < requested_count:
        next_type = preferred_cycle[len(items) % len(preferred_cycle)]
        items.append(_build_fallback_playground_question(next_type, topic))

    return items[:requested_count]


def _normalize_playground_questions(raw_questions, requested_count):
    if not isinstance(raw_questions, list):
        raise ValidationError({"detail": "Gemini response must include a questions array."})

    normalized = []
    for item in raw_questions:
        normalized_question = _normalize_single_playground_question(item)
        if normalized_question:
            normalized.append(normalized_question)

        if len(normalized) >= requested_count:
            break

    if not normalized:
        raise ValidationError(
            {
                "detail": (
                    "Unable to generate valid practice questions for this topic. "
                    "Please try a more specific topic."
                )
            }
        )

    return normalized


def _generate_questions_with_gemini(user, topic, difficulty, question_count, question_type="mixed"):
    api_key = getattr(settings, "GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValidationError(
            {"detail": "Gemini API key is not configured on the backend."}
        )

    configured_model = (
        getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash").strip()
        or "gemini-2.5-flash"
    )
    base_url = getattr(
        settings,
        "GEMINI_API_URL",
        "https://generativelanguage.googleapis.com",
    ).rstrip("/")
    timeout_seconds = int(getattr(settings, "PLAYGROUND_GENERATE_TIMEOUT_SECONDS", 25))

    normalized_type = str(question_type or "mixed").strip().lower()
    force_single_type = normalized_type in PLAYGROUND_REQUIRED_TYPES

    type_instruction = (
        (
            f"Generate {question_count} questions and every question MUST use question_type '{normalized_type}'. "
            "Do not include any other question type. "
        )
        if force_single_type
        else (
            f"Generate {question_count} questions. "
            "If question_count >= 4, include at least one question of each type. "
        )
    )

    prompt = (
        "You are generating practice questions for a student exam playground. "
        "Return ONLY valid JSON with this exact top-level structure: "
        '{"questions":[...]}.'
        " Each question MUST include question_type and question_text. "
        "Allowed question_type values: mcq, subjective, coding, dsa. "
        "Field rules by type: "
        "1) mcq => options (exactly 4 strings), correct_option_index (0-3), optional explanation. "
        "2) subjective => expected_answer (model/reference answer), optional explanation. "
        "3) coding => coding_language (python/javascript/java/c/cpp), problem_statement, input_format, output_format, constraints, sample_test_cases as array of {input,output}, optional explanation. "
        "4) dsa => same as coding plus hidden_test_cases as array of {input,output}. "
        "Do not include markdown. Do not include extra keys outside this schema. "
        f"{type_instruction}"
        f"Topic: {topic}. "
        f"Difficulty: {difficulty}. "
        f"Student department: {user.department.name}. "
        f"Student course: {user.course.name}. "
        "Questions must stay inside this enrolled course context."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.6,
            "responseMimeType": "application/json",
        },
    }

    model_candidates = []
    for candidate in (
        configured_model,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
    ):
        normalized = str(candidate or "").strip()
        if normalized.startswith("models/"):
            normalized = normalized.split("/", 1)[1]
        if normalized and normalized not in model_candidates:
            model_candidates.append(normalized)

    attempt_errors = []
    for model_name in model_candidates:
        endpoint = f"{base_url}/v1beta/models/{model_name}:generateContent"

        try:
            response = requests.post(
                endpoint,
                params={"key": api_key},
                json=payload,
                timeout=timeout_seconds,
            )
        except requests.RequestException as exc:
            raise ValidationError(
                {"detail": "Gemini request failed. Please try again shortly."}
            ) from exc

        if response.status_code >= 400:
            attempt_errors.append(f"{model_name}:{response.status_code}")
            if response.status_code in (404, 429, 503):
                continue

            raise ValidationError(
                {
                    "detail": (
                        "Gemini request failed with status "
                        f"{response.status_code}. Check API key, model, and quota limits."
                    )
                }
            )

        try:
            response_data = response.json()
        except ValueError:
            attempt_errors.append(f"{model_name}:invalid_json")
            continue

        candidates = response_data.get("candidates") or []
        if not candidates:
            attempt_errors.append(f"{model_name}:no_candidates")
            continue

        parts = (candidates[0].get("content") or {}).get("parts") or []
        generated_text = "".join(
            str(part.get("text", "")) for part in parts if isinstance(part, dict)
        )

        try:
            parsed = _extract_json_payload(generated_text)
            raw_questions = parsed.get("questions") if isinstance(parsed, dict) else None
            questions = _normalize_playground_questions(raw_questions, question_count)
        except ValidationError:
            attempt_errors.append(f"{model_name}:invalid_payload")
            continue

        return model_name, questions

    error_suffix = ""
    if attempt_errors:
        error_suffix = f" Tried models ({', '.join(attempt_errors[:4])})."

    raise ValidationError(
        {
            "detail": (
                "Gemini request failed for all candidate models. "
                "Check model availability and quota limits."
                f"{error_suffix}"
            )
        }
    )


def generate_playground_session(user, topic, difficulty, question_count, question_type="mixed"):
    _require_playground_enrollment(user)

    normalized_type = str(question_type or "mixed").strip().lower()
    if normalized_type not in PLAYGROUND_REQUIRED_TYPES and normalized_type != "mixed":
        normalized_type = "mixed"

    max_questions = int(getattr(settings, "PLAYGROUND_MAX_QUESTION_COUNT", 10))
    if question_count > max_questions:
        raise ValidationError({"detail": f"Maximum allowed question_count is {max_questions}."})

    model_name, generated_questions = _generate_questions_with_gemini(
        user,
        topic=topic,
        difficulty=difficulty,
        question_count=question_count,
        question_type=normalized_type,
    )
    generated_questions = _ensure_playground_type_coverage(
        generated_questions,
        question_count,
        topic,
        selected_question_type=normalized_type,
    )

    with transaction.atomic():
        session = PlaygroundSession.objects.create(
            organization_id=user.organization_id,
            student=user,
            department_id=user.department_id,
            course_id=user.course_id,
            topic=topic,
            difficulty=difficulty,
            requested_question_count=question_count,
            generated_question_count=len(generated_questions),
            generator_model=model_name,
        )

        PlaygroundQuestion.objects.bulk_create(
            [
                PlaygroundQuestion(
                    session=session,
                    organization_id=user.organization_id,
                    question_type=row["question_type"],
                    question_text=row["question_text"],
                    options=row["options"],
                    correct_option_index=row["correct_option_index"],
                    expected_answer=row["expected_answer"],
                    coding_language=row["coding_language"],
                    problem_statement=row["problem_statement"],
                    input_format=row["input_format"],
                    output_format=row["output_format"],
                    constraints=row["constraints"],
                    sample_test_cases=row["sample_test_cases"],
                    hidden_test_cases=row["hidden_test_cases"],
                    explanation=row["explanation"],
                    order=index,
                )
                for index, row in enumerate(generated_questions, start=1)
            ]
        )

        created_questions = list(session.questions.order_by("order"))
        PlaygroundAnswer.objects.bulk_create(
            [
                PlaygroundAnswer(
                    session=session,
                    question=question,
                )
                for question in created_questions
            ]
        )

    return session


def list_playground_sessions(user):
    _require_playground_enrollment(user)
    return PlaygroundSession.objects.filter(
        organization_id=user.organization_id,
        student=user,
    ).order_by("-created_at")


def get_playground_session(user, session_id):
    _require_playground_enrollment(user)
    session = PlaygroundSession.objects.filter(
        id=session_id,
        organization_id=user.organization_id,
        student=user,
    ).first()
    if not session:
        raise NotFound("Playground session not found.")
    return session


def get_playground_questions_with_answers(user, session_id):
    session = get_playground_session(user, session_id)
    questions = list(session.questions.order_by("order"))
    answer_rows = list(
        PlaygroundAnswer.objects.filter(session=session).select_related("question")
    )
    answer_map = {str(answer.question_id): answer for answer in answer_rows}
    return session, questions, answer_map


def _serialize_validation_detail(value):
    if isinstance(value, dict):
        return {
            str(key): _serialize_validation_detail(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_serialize_validation_detail(item) for item in value]
    return str(value)


def _normalize_compare_text(value):
    return " ".join(str(value or "").strip().lower().split())


def _is_subjective_answer_correct(submitted_answer, expected_answer):
    submitted = _normalize_compare_text(submitted_answer)
    expected = _normalize_compare_text(expected_answer)

    if not submitted or not expected:
        return False

    if submitted == expected:
        return True

    if len(submitted) >= 15 and submitted in expected:
        return True

    if len(expected) >= 15 and expected in submitted:
        return True

    return SequenceMatcher(None, submitted, expected).ratio() >= 0.72


def _evaluate_playground_code_answer(question, code_answer):
    source_code = str(code_answer or "")
    if not source_code.strip():
        return False, {"detail": "Code answer is required for this question."}

    language = str(question.coding_language or "python").strip().lower()
    if language not in PLAYGROUND_EXECUTABLE_LANGUAGES:
        return False, {
            "detail": (
                f'Language "{question.coding_language or language}" '
                "is not supported in playground execution."
            )
        }

    test_cases = (
        question.hidden_test_cases
        if question.question_type == "dsa"
        else question.sample_test_cases
    )

    try:
        result = execute_code(
            language=language,
            source=source_code,
            test_cases=test_cases,
            timeout=3,
            memory_limit_mb=256,
        )
    except ValidationError as exc:
        return False, {"detail": _serialize_validation_detail(exc.detail)}
    except Exception:
        logger.exception(
            "Playground code evaluation failed unexpectedly for question_id=%s",
            question.id,
        )
        return False, {"detail": "Code evaluation failed unexpectedly."}

    passed_count = int(result.get("passed_count") or 0)
    total_cases = int(result.get("total_cases") or 0)
    is_correct = total_cases > 0 and passed_count == total_cases

    execution_result = {
        "language": result.get("language", language),
        "passed_count": passed_count,
        "total_cases": total_cases,
        "ratio": str(result.get("ratio", "0")),
    }

    if question.question_type == "dsa":
        execution_result["detail"] = "Evaluated using hidden test cases."
    else:
        execution_result["case_results"] = result.get("case_results", [])

    return is_correct, execution_result


def submit_playground_session(user, session_id, answers_payload):
    session = get_playground_session(user, session_id)
    if session.status == "submitted":
        return session

    answers_by_question = {
        str(row["question_id"]): row
        for row in answers_payload
    }

    answer_rows = list(
        PlaygroundAnswer.objects.filter(session=session).select_related("question")
    )
    answer_map = {str(answer.question_id): answer for answer in answer_rows}

    for question_id in answers_by_question:
        if question_id not in answer_map:
            raise ValidationError({"answers": "One or more question_id values are invalid."})

    missing_code_questions = []
    for question_id, answer in answer_map.items():
        question_type = answer.question.question_type
        if question_type not in ("coding", "dsa"):
            continue

        payload = answers_by_question.get(question_id, {})
        code_answer = str(payload.get("code_answer", "")).strip()
        if not code_answer:
            missing_code_questions.append(answer.question.order)

    if missing_code_questions:
        order_text = ", ".join(str(order) for order in sorted(missing_code_questions))
        raise ValidationError(
            {
                "answers": (
                    "Code answer is required for all Coding/DSA questions before submission. "
                    f"Missing question numbers: {order_text}."
                )
            }
        )

    with transaction.atomic():
        now = timezone.now()

        for question_id, answer in answer_map.items():
            payload = answers_by_question.get(question_id, {})

            answer.selected_option_index = None
            answer.text_answer = ""
            answer.code_answer = ""
            answer.execution_result = {}
            answer.is_correct = False

            question_type = answer.question.question_type

            if question_type == "mcq":
                selected = payload.get("selected_option_index")
                if selected is not None:
                    selected = int(selected)

                option_count = len(answer.question.options or [])
                if selected is not None and option_count > 0 and 0 <= selected < option_count:
                    answer.selected_option_index = selected
                    answer.is_correct = selected == answer.question.correct_option_index

            elif question_type == "subjective":
                text_answer = str(payload.get("text_answer", "")).strip()
                answer.text_answer = text_answer
                answer.is_correct = _is_subjective_answer_correct(
                    text_answer,
                    answer.question.expected_answer,
                )

            else:
                code_answer = str(payload.get("code_answer", ""))
                answer.code_answer = code_answer
                is_correct, execution_result = _evaluate_playground_code_answer(
                    answer.question,
                    code_answer,
                )
                answer.is_correct = is_correct
                answer.execution_result = execution_result

            answer.updated_at = now

        PlaygroundAnswer.objects.bulk_update(
            answer_map.values(),
            [
                "selected_option_index",
                "text_answer",
                "code_answer",
                "execution_result",
                "is_correct",
                "updated_at",
            ],
        )

        total_questions = len(answer_map)
        correct_answers = sum(
            1 for answer in answer_map.values() if answer.is_correct
        )

        score_percent = Decimal("0.00")
        if total_questions > 0:
            score_percent = (
                (Decimal(correct_answers) / Decimal(total_questions)) * Decimal("100")
            ).quantize(Decimal("0.01"))

        session.status = "submitted"
        session.submitted_at = timezone.now()
        session.correct_answers = correct_answers
        session.score_percent = score_percent
        session.save(
            update_fields=[
                "status",
                "submitted_at",
                "correct_answers",
                "score_percent",
            ]
        )

    return session


def get_playground_summary(user):
    _require_playground_enrollment(user)
    queryset = PlaygroundSession.objects.filter(
        organization_id=user.organization_id,
        student=user,
    )

    submitted = queryset.filter(status="submitted")
    aggregate = submitted.aggregate(
        total_questions=Sum("generated_question_count"),
        total_correct=Sum("correct_answers"),
        average_score=Avg("score_percent"),
    )

    return {
        "total_tests": queryset.count(),
        "submitted_tests": submitted.count(),
        "total_questions": int(aggregate["total_questions"] or 0),
        "total_correct": int(aggregate["total_correct"] or 0),
        "average_score": str((aggregate["average_score"] or Decimal("0.00")).quantize(Decimal("0.01"))),
    }
