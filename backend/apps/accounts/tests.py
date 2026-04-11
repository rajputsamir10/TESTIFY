from datetime import timedelta
import re

from django.conf import settings
from django.core.cache import cache
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import CustomUser
from apps.attempts.models import Answer, Attempt
from apps.departments.models import Course, Department
from apps.organizations.models import Organization
from apps.questions.models import MCQOption
from apps.results.models import Result


def _strong_password():
    return "StrongPass@123"


@override_settings(RATELIMIT_ENABLE=False, EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class BackendSmokeFlowTests(APITestCase):
    def setUp(self):
        cache.clear()

        self.org = Organization.objects.create(
            name="Testify Org",
            email="org@testify.local",
            plan="enterprise",
            is_active=True,
        )
        self.department = Department.objects.create(
            organization=self.org,
            name="Computer Science",
            code="CSE",
        )
        self.course = Course.objects.create(
            organization=self.org,
            department=self.department,
            name="B.Tech CS",
            code="BTCS",
        )
        self.other_course = Course.objects.create(
            organization=self.org,
            department=self.department,
            name="BCA",
            code="BCA",
        )

        self.god = CustomUser.objects.create_superuser(
            email="god@testify.local",
            full_name="God User",
            password=_strong_password(),
        )
        self.admin = CustomUser.objects.create_user(
            email="admin@testify.local",
            full_name="Admin User",
            password=_strong_password(),
            role="admin",
            organization=self.org,
            is_staff=True,
        )
        self.teacher = CustomUser.objects.create_user(
            email="teacher@testify.local",
            full_name="Teacher User",
            password=_strong_password(),
            role="teacher",
            organization=self.org,
            department=self.department,
            teacher_id="T-001",
            is_staff=True,
        )
        self.student = CustomUser.objects.create_user(
            email="student@testify.local",
            full_name="Student User",
            password=_strong_password(),
            role="student",
            organization=self.org,
            department=self.department,
            course=self.course,
            roll_number="S-001",
            batch_year="2026",
        )

    def _login(self, path, payload):
        response = self.client.post(path, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access", response.data)
        return response.data["access"], response.data.get("refresh")

    @staticmethod
    def _authed_client(token):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def test_admin_signup_requires_email_verification_code(self):
        signup_payload = {
            "full_name": "New Admin User",
            "email": "new-admin@testify.local",
            "password": _strong_password(),
            "confirm_password": _strong_password(),
            "organization_name": "New Org",
            "organization_email": "new-org@testify.local",
        }

        unverified_signup_response = self.client.post(
            "/api/auth/admin/signup/",
            signup_payload,
            format="json",
        )
        self.assertEqual(
            unverified_signup_response.status_code,
            status.HTTP_400_BAD_REQUEST,
            unverified_signup_response.data,
        )

        request_otp_response = self.client.post(
            "/api/auth/admin/signup/request-otp/",
            {"email": signup_payload["email"]},
            format="json",
        )
        self.assertEqual(request_otp_response.status_code, status.HTTP_200_OK, request_otp_response.data)
        self.assertGreaterEqual(len(mail.outbox), 1)

        otp_body = mail.outbox[-1].body
        otp_match = re.search(r"\b(\d{6})\b", otp_body)
        self.assertIsNotNone(otp_match)
        otp_code = otp_match.group(1)

        verify_otp_response = self.client.post(
            "/api/auth/admin/signup/verify-otp/",
            {"email": signup_payload["email"], "otp": otp_code},
            format="json",
        )
        self.assertEqual(verify_otp_response.status_code, status.HTTP_200_OK, verify_otp_response.data)

        verified_signup_response = self.client.post(
            "/api/auth/admin/signup/",
            signup_payload,
            format="json",
        )
        self.assertEqual(
            verified_signup_response.status_code,
            status.HTTP_201_CREATED,
            verified_signup_response.data,
        )

    def test_admin_signup_allows_email_used_by_student_in_other_account(self):
        signup_payload = {
            "full_name": "Second Admin",
            "email": self.student.email,
            "password": _strong_password(),
            "confirm_password": _strong_password(),
            "organization_name": "Parallel Org",
            "organization_email": "parallel-org@testify.local",
        }

        request_otp_response = self.client.post(
            "/api/auth/admin/signup/request-otp/",
            {"email": signup_payload["email"]},
            format="json",
        )
        self.assertEqual(request_otp_response.status_code, status.HTTP_200_OK, request_otp_response.data)
        self.assertGreaterEqual(len(mail.outbox), 1)

        otp_body = mail.outbox[-1].body
        otp_match = re.search(r"\b(\d{6})\b", otp_body)
        self.assertIsNotNone(otp_match)
        otp_code = otp_match.group(1)

        verify_otp_response = self.client.post(
            "/api/auth/admin/signup/verify-otp/",
            {"email": signup_payload["email"], "otp": otp_code},
            format="json",
        )
        self.assertEqual(verify_otp_response.status_code, status.HTTP_200_OK, verify_otp_response.data)

        signup_response = self.client.post(
            "/api/auth/admin/signup/",
            signup_payload,
            format="json",
        )
        self.assertEqual(signup_response.status_code, status.HTTP_201_CREATED, signup_response.data)

        users_with_email = CustomUser.objects.filter(email__iexact=self.student.email)
        self.assertEqual(users_with_email.count(), 2)
        self.assertTrue(users_with_email.filter(role="student").exists())
        self.assertTrue(users_with_email.filter(role="admin").exists())

    def test_admin_signup_rejects_same_admin_email_for_different_organization(self):
        signup_payload = {
            "full_name": "Parallel Admin",
            "email": self.admin.email,
            "password": "AnotherStrongPass@456",
            "confirm_password": "AnotherStrongPass@456",
            "organization_name": "Parallel Admin Org",
            "organization_email": "parallel-admin-org@testify.local",
        }

        request_otp_response = self.client.post(
            "/api/auth/admin/signup/request-otp/",
            {"email": signup_payload["email"]},
            format="json",
        )
        self.assertEqual(request_otp_response.status_code, status.HTTP_400_BAD_REQUEST, request_otp_response.data)

        signup_response = self.client.post(
            "/api/auth/admin/signup/",
            signup_payload,
            format="json",
        )
        self.assertEqual(signup_response.status_code, status.HTTP_400_BAD_REQUEST, signup_response.data)

        admins_with_email = CustomUser.objects.filter(email__iexact=self.admin.email, role="admin")
        self.assertEqual(admins_with_email.count(), 1)

    def test_admin_login_sets_http_only_auth_cookies(self):
        response = self.client.post(
            "/api/auth/admin/login/",
            {"email": self.admin.email, "password": _strong_password()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn(settings.AUTH_COOKIE_ACCESS_NAME, response.cookies)
        self.assertIn(settings.AUTH_COOKIE_REFRESH_NAME, response.cookies)
        self.assertTrue(response.cookies[settings.AUTH_COOKIE_ACCESS_NAME]["httponly"])
        self.assertTrue(response.cookies[settings.AUTH_COOKIE_REFRESH_NAME]["httponly"])

    def test_me_endpoint_authenticates_using_access_cookie(self):
        login_response = self.client.post(
            "/api/auth/admin/login/",
            {"email": self.admin.email, "password": _strong_password()},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)

        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK, me_response.data)
        self.assertEqual(me_response.data["email"], self.admin.email)

    def test_refresh_works_using_refresh_cookie_without_request_body(self):
        login_response = self.client.post(
            "/api/auth/admin/login/",
            {"email": self.admin.email, "password": _strong_password()},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)

        refresh_response = self.client.post(
            "/api/auth/token/refresh/",
            {},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK, refresh_response.data)
        self.assertIn("access", refresh_response.data)
        self.assertIn(settings.AUTH_COOKIE_ACCESS_NAME, refresh_response.cookies)

    def test_logout_clears_auth_cookies_without_refresh_payload(self):
        login_response = self.client.post(
            "/api/auth/admin/login/",
            {"email": self.admin.email, "password": _strong_password()},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)

        logout_response = self.client.post(
            "/api/auth/logout/",
            {},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK, logout_response.data)

        self.assertIn(settings.AUTH_COOKIE_ACCESS_NAME, logout_response.cookies)
        self.assertIn(settings.AUTH_COOKIE_REFRESH_NAME, logout_response.cookies)
        self.assertEqual(str(logout_response.cookies[settings.AUTH_COOKIE_ACCESS_NAME]["max-age"]), "0")
        self.assertEqual(str(logout_response.cookies[settings.AUTH_COOKIE_REFRESH_NAME]["max-age"]), "0")

        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_god_admin_teacher_student_notification_end_to_end(self):
        god_access, _ = self._login(
            "/api/auth/god/login/",
            {"email": self.god.email, "password": _strong_password()},
        )
        god_client = self._authed_client(god_access)

        me_response = god_client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["role"], "god")

        stats_response = god_client.get("/api/god/stats/")
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(stats_response.data["organizations_total"], 1)

        organizations_response = god_client.get("/api/god/organizations/")
        self.assertEqual(organizations_response.status_code, status.HTTP_200_OK)

        users_response = god_client.get("/api/god/users/")
        self.assertEqual(users_response.status_code, status.HTTP_200_OK)

        admin_access, admin_refresh = self._login(
            "/api/auth/admin/login/",
            {"email": self.admin.email, "password": _strong_password()},
        )
        admin_client = self._authed_client(admin_access)

        org_response = admin_client.get("/api/admin/organization/")
        self.assertEqual(org_response.status_code, status.HTTP_200_OK)

        departments_response = admin_client.get("/api/admin/departments/")
        self.assertEqual(departments_response.status_code, status.HTTP_200_OK)

        courses_response = admin_client.get("/api/admin/courses/")
        self.assertEqual(courses_response.status_code, status.HTTP_200_OK)

        users_list_response = admin_client.get("/api/admin/users/")
        self.assertEqual(users_list_response.status_code, status.HTTP_200_OK)

        teacher_access, _ = self._login(
            "/api/auth/teacher/login/",
            {"teacher_id": self.teacher.teacher_id, "password": _strong_password()},
        )
        teacher_client = self._authed_client(teacher_access)

        now = timezone.now()
        create_exam_response = teacher_client.post(
            "/api/teacher/exams/",
            {
                "department": str(self.department.id),
                "course": str(self.course.id),
                "title": "Backend Smoke Exam",
                "description": "Smoke test exam",
                "pass_marks": "1.00",
                "duration_minutes": 120,
                "start_time": (now - timedelta(minutes=5)).isoformat(),
                "end_time": (now + timedelta(minutes=60)).isoformat(),
                "shuffle_questions": False,
                "allow_review": True,
            },
            format="json",
        )
        self.assertEqual(create_exam_response.status_code, status.HTTP_201_CREATED, create_exam_response.data)
        exam_id = create_exam_response.data["id"]

        create_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": exam_id,
                "question_text": "What is 2 + 2?",
                "question_type": "mcq",
                "marks": "2.00",
                "negative_marks": "0.00",
                "order": 1,
                "options": [
                    {"option_text": "4", "is_correct": True, "order": 1},
                    {"option_text": "5", "is_correct": False, "order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(create_question_response.status_code, status.HTTP_201_CREATED, create_question_response.data)

        publish_exam_response = teacher_client.post(f"/api/teacher/exams/{exam_id}/publish/")
        self.assertEqual(publish_exam_response.status_code, status.HTTP_200_OK, publish_exam_response.data)

        create_other_course_exam_response = teacher_client.post(
            "/api/teacher/exams/",
            {
                "department": str(self.department.id),
                "course": str(self.other_course.id),
                "title": "Other Course Exam",
                "description": "Should not be visible for the first student course.",
                "pass_marks": "1.00",
                "duration_minutes": 120,
                "start_time": (now - timedelta(minutes=5)).isoformat(),
                "end_time": (now + timedelta(minutes=60)).isoformat(),
                "shuffle_questions": False,
                "allow_review": True,
            },
            format="json",
        )
        self.assertEqual(
            create_other_course_exam_response.status_code,
            status.HTTP_201_CREATED,
            create_other_course_exam_response.data,
        )
        other_exam_id = create_other_course_exam_response.data["id"]

        create_other_course_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": other_exam_id,
                "question_text": "Other course question",
                "question_type": "mcq",
                "marks": "1.00",
                "negative_marks": "0.00",
                "order": 1,
                "options": [
                    {"option_text": "A", "is_correct": True, "order": 1},
                    {"option_text": "B", "is_correct": False, "order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(
            create_other_course_question_response.status_code,
            status.HTTP_201_CREATED,
            create_other_course_question_response.data,
        )

        publish_other_exam_response = teacher_client.post(f"/api/teacher/exams/{other_exam_id}/publish/")
        self.assertEqual(
            publish_other_exam_response.status_code,
            status.HTTP_200_OK,
            publish_other_exam_response.data,
        )

        student_access, student_refresh = self._login(
            "/api/auth/student/login/",
            {"roll_number": self.student.roll_number, "password": _strong_password()},
        )
        decoded_student_access = AccessToken(student_access)
        self.assertEqual(decoded_student_access.get("role"), "student")
        student_client = self._authed_client(student_access)

        admin_on_student_endpoint = admin_client.get("/api/student/exams/available/")
        self.assertEqual(admin_on_student_endpoint.status_code, status.HTTP_403_FORBIDDEN)

        available_exams_response = student_client.get("/api/student/exams/available/")
        self.assertEqual(available_exams_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == exam_id for item in available_exams_response.data))
        self.assertFalse(any(item["id"] == other_exam_id for item in available_exams_response.data))

        start_exam_response = student_client.post(f"/api/student/exams/{exam_id}/start/")
        self.assertEqual(start_exam_response.status_code, status.HTTP_201_CREATED, start_exam_response.data)
        attempt_id = start_exam_response.data["id"]

        remaining_time_response = student_client.get(f"/api/student/attempts/{attempt_id}/remaining-time/")
        self.assertEqual(remaining_time_response.status_code, status.HTTP_200_OK)
        self.assertIn("remaining_seconds", remaining_time_response.data)
        self.assertLessEqual(remaining_time_response.data["remaining_seconds"], 3600)

        answers_response = student_client.get(f"/api/student/attempts/{attempt_id}/answers/")
        self.assertEqual(answers_response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(answers_response.data), 0)

        answer_id = answers_response.data[0]["id"]
        answer = Answer.objects.select_related("question").get(id=answer_id)
        correct_option = MCQOption.objects.get(question=answer.question, is_correct=True)

        update_answer_response = student_client.put(
            f"/api/student/answers/{answer_id}/",
            {"selected_option": str(correct_option.id)},
            format="json",
        )
        self.assertEqual(update_answer_response.status_code, status.HTTP_200_OK, update_answer_response.data)

        submit_response = student_client.post(f"/api/student/attempts/{attempt_id}/submit/")
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK, submit_response.data)

        publish_results_response = teacher_client.post(f"/api/teacher/exams/{exam_id}/publish-results/")
        self.assertEqual(publish_results_response.status_code, status.HTTP_200_OK, publish_results_response.data)

        published_result = Result.objects.filter(
            attempt_id=attempt_id,
            student=self.student,
            exam_id=exam_id,
        ).first()
        self.assertIsNotNone(published_result)
        self.assertTrue(published_result.is_published)

        student_results_response = student_client.get("/api/student/results/")
        self.assertEqual(student_results_response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(student_results_response.data), 0)

        result_id = str(published_result.id)
        review_response = student_client.get(f"/api/student/results/{result_id}/review/")
        self.assertEqual(review_response.status_code, status.HTTP_200_OK)

        pdf_response = student_client.get(f"/api/student/results/{result_id}/download/?format=pdf")
        self.assertEqual(
            pdf_response.status_code,
            status.HTTP_200_OK,
            getattr(pdf_response, "data", pdf_response.content[:300]),
        )
        self.assertEqual(pdf_response["Content-Type"], "application/pdf")

        excel_response = student_client.get(f"/api/student/results/{result_id}/download/?format=excel")
        self.assertEqual(
            excel_response.status_code,
            status.HTTP_200_OK,
            getattr(excel_response, "data", excel_response.content[:300]),
        )
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            excel_response["Content-Type"],
        )

        unread_response = student_client.get("/api/notifications/unread-count/")
        self.assertEqual(unread_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(unread_response.data["unread_count"], 1)

        read_all_response = student_client.patch("/api/notifications/read-all/")
        self.assertEqual(read_all_response.status_code, status.HTTP_200_OK)

        unread_after_response = student_client.get("/api/notifications/unread-count/")
        self.assertEqual(unread_after_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unread_after_response.data["unread_count"], 0)

        logout_response = admin_client.post(
            "/api/auth/logout/",
            {"refresh": admin_refresh},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        student_logout_response = student_client.post(
            "/api/auth/logout/",
            {"refresh": student_refresh},
            format="json",
        )
        self.assertEqual(student_logout_response.status_code, status.HTTP_200_OK)

    def test_second_violation_auto_submits_attempt(self):
        teacher_access, _ = self._login(
            "/api/auth/teacher/login/",
            {"teacher_id": self.teacher.teacher_id, "password": _strong_password()},
        )
        teacher_client = self._authed_client(teacher_access)

        now = timezone.now()
        create_exam_response = teacher_client.post(
            "/api/teacher/exams/",
            {
                "department": str(self.department.id),
                "course": str(self.course.id),
                "title": "Violation Exam",
                "description": "Violation handling exam",
                "pass_marks": "1.00",
                "duration_minutes": 45,
                "start_time": (now - timedelta(minutes=5)).isoformat(),
                "end_time": (now + timedelta(minutes=90)).isoformat(),
                "shuffle_questions": False,
                "allow_review": True,
            },
            format="json",
        )
        self.assertEqual(create_exam_response.status_code, status.HTTP_201_CREATED, create_exam_response.data)
        exam_id = create_exam_response.data["id"]

        create_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": exam_id,
                "question_text": "Pick one",
                "question_type": "mcq",
                "marks": "1.00",
                "negative_marks": "0.00",
                "order": 1,
                "options": [
                    {"option_text": "A", "is_correct": True, "order": 1},
                    {"option_text": "B", "is_correct": False, "order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(create_question_response.status_code, status.HTTP_201_CREATED, create_question_response.data)

        publish_exam_response = teacher_client.post(f"/api/teacher/exams/{exam_id}/publish/")
        self.assertEqual(publish_exam_response.status_code, status.HTTP_200_OK, publish_exam_response.data)

        student_access, _ = self._login(
            "/api/auth/student/login/",
            {"roll_number": self.student.roll_number, "password": _strong_password()},
        )
        student_client = self._authed_client(student_access)

        start_exam_response = student_client.post(f"/api/student/exams/{exam_id}/start/")
        self.assertEqual(start_exam_response.status_code, status.HTTP_201_CREATED, start_exam_response.data)
        attempt_id = start_exam_response.data["id"]

        first_violation_response = student_client.post(f"/api/student/attempts/{attempt_id}/violation/")
        self.assertEqual(first_violation_response.status_code, status.HTTP_200_OK, first_violation_response.data)
        self.assertEqual(first_violation_response.data["violation_count"], 1)
        self.assertFalse(first_violation_response.data["auto_submitted"])

        second_violation_response = student_client.post(f"/api/student/attempts/{attempt_id}/violation/")
        self.assertEqual(second_violation_response.status_code, status.HTTP_200_OK, second_violation_response.data)
        self.assertEqual(second_violation_response.data["violation_count"], 2)
        self.assertTrue(second_violation_response.data["auto_submitted"])

        attempt = Attempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, "submitted")
        self.assertTrue(attempt.is_auto_submitted)

    def test_teacher_cannot_modify_exam_after_student_starts_attempt(self):
        teacher_access, _ = self._login(
            "/api/auth/teacher/login/",
            {"teacher_id": self.teacher.teacher_id, "password": _strong_password()},
        )
        teacher_client = self._authed_client(teacher_access)

        now = timezone.now()
        create_exam_response = teacher_client.post(
            "/api/teacher/exams/",
            {
                "department": str(self.department.id),
                "course": str(self.course.id),
                "title": "Locked Exam",
                "description": "Exam lock behavior",
                "pass_marks": "1.00",
                "duration_minutes": 45,
                "start_time": (now - timedelta(minutes=5)).isoformat(),
                "end_time": (now + timedelta(minutes=90)).isoformat(),
                "shuffle_questions": False,
                "allow_review": True,
            },
            format="json",
        )
        self.assertEqual(create_exam_response.status_code, status.HTTP_201_CREATED, create_exam_response.data)
        exam_id = create_exam_response.data["id"]

        create_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": exam_id,
                "question_text": "Initial question",
                "question_type": "mcq",
                "marks": "1.00",
                "negative_marks": "0.00",
                "order": 1,
                "options": [
                    {"option_text": "A", "is_correct": True, "order": 1},
                    {"option_text": "B", "is_correct": False, "order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(create_question_response.status_code, status.HTTP_201_CREATED, create_question_response.data)
        question_id = create_question_response.data["id"]

        publish_exam_response = teacher_client.post(f"/api/teacher/exams/{exam_id}/publish/")
        self.assertEqual(publish_exam_response.status_code, status.HTTP_200_OK, publish_exam_response.data)

        student_access, _ = self._login(
            "/api/auth/student/login/",
            {"roll_number": self.student.roll_number, "password": _strong_password()},
        )
        student_client = self._authed_client(student_access)

        start_exam_response = student_client.post(f"/api/student/exams/{exam_id}/start/")
        self.assertEqual(start_exam_response.status_code, status.HTTP_201_CREATED, start_exam_response.data)

        update_exam_response = teacher_client.put(
            f"/api/teacher/exams/{exam_id}/",
            {"title": "Should Fail"},
            format="json",
        )
        self.assertEqual(update_exam_response.status_code, status.HTTP_400_BAD_REQUEST, update_exam_response.data)
        self.assertEqual(
            update_exam_response.data.get("detail"),
            "Times up exam is already Started by the Students ",
        )

        create_second_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": exam_id,
                "question_text": "Should not be added",
                "question_type": "mcq",
                "marks": "1.00",
                "negative_marks": "0.00",
                "order": 2,
                "options": [
                    {"option_text": "X", "is_correct": True, "order": 1},
                    {"option_text": "Y", "is_correct": False, "order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(
            create_second_question_response.status_code,
            status.HTTP_400_BAD_REQUEST,
            create_second_question_response.data,
        )
        self.assertEqual(
            create_second_question_response.data.get("detail"),
            "Times up exam is already Started by the Students ",
        )

        delete_question_response = teacher_client.delete(f"/api/teacher/questions/{question_id}/")
        self.assertEqual(
            delete_question_response.status_code,
            status.HTTP_400_BAD_REQUEST,
            getattr(delete_question_response, "data", None),
        )
        self.assertEqual(
            getattr(delete_question_response, "data", {}).get("detail"),
            "Times up exam is already Started by the Students ",
        )

    def test_student_gets_clear_message_when_exam_not_started(self):
        teacher_access, _ = self._login(
            "/api/auth/teacher/login/",
            {"teacher_id": self.teacher.teacher_id, "password": _strong_password()},
        )
        teacher_client = self._authed_client(teacher_access)

        now = timezone.now()
        create_exam_response = teacher_client.post(
            "/api/teacher/exams/",
            {
                "department": str(self.department.id),
                "course": str(self.course.id),
                "title": "Future Exam",
                "description": "Future schedule",
                "pass_marks": "1.00",
                "duration_minutes": 30,
                "start_time": (now + timedelta(minutes=20)).isoformat(),
                "end_time": (now + timedelta(minutes=120)).isoformat(),
                "shuffle_questions": False,
                "allow_review": True,
            },
            format="json",
        )
        self.assertEqual(create_exam_response.status_code, status.HTTP_201_CREATED, create_exam_response.data)
        exam_id = create_exam_response.data["id"]

        create_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": exam_id,
                "question_text": "Future question",
                "question_type": "mcq",
                "marks": "1.00",
                "negative_marks": "0.00",
                "order": 1,
                "options": [
                    {"option_text": "A", "is_correct": True, "order": 1},
                    {"option_text": "B", "is_correct": False, "order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(create_question_response.status_code, status.HTTP_201_CREATED, create_question_response.data)

        publish_exam_response = teacher_client.post(f"/api/teacher/exams/{exam_id}/publish/")
        self.assertEqual(publish_exam_response.status_code, status.HTTP_200_OK, publish_exam_response.data)

        student_access, _ = self._login(
            "/api/auth/student/login/",
            {"roll_number": self.student.roll_number, "password": _strong_password()},
        )
        student_client = self._authed_client(student_access)

        available_exams_response = student_client.get("/api/student/exams/available/")
        self.assertEqual(available_exams_response.status_code, status.HTTP_200_OK, available_exams_response.data)
        self.assertTrue(any(item["id"] == exam_id for item in available_exams_response.data))

        start_exam_response = student_client.post(f"/api/student/exams/{exam_id}/start/")
        self.assertEqual(start_exam_response.status_code, status.HTTP_400_BAD_REQUEST, start_exam_response.data)
        self.assertEqual(
            start_exam_response.data["detail"],
            "Exam has not started yet. Please wait until the scheduled time.",
        )

    def test_coding_question_run_and_submission_scoring(self):
        teacher_access, _ = self._login(
            "/api/auth/teacher/login/",
            {"teacher_id": self.teacher.teacher_id, "password": _strong_password()},
        )
        teacher_client = self._authed_client(teacher_access)

        now = timezone.now()
        create_exam_response = teacher_client.post(
            "/api/teacher/exams/",
            {
                "department": str(self.department.id),
                "course": str(self.course.id),
                "title": "Coding Exam",
                "description": "Coding flow",
                "pass_marks": "1.00",
                "duration_minutes": 30,
                "start_time": (now - timedelta(minutes=5)).isoformat(),
                "end_time": (now + timedelta(minutes=30)).isoformat(),
                "shuffle_questions": False,
                "allow_review": True,
            },
            format="json",
        )
        self.assertEqual(create_exam_response.status_code, status.HTTP_201_CREATED, create_exam_response.data)
        exam_id = create_exam_response.data["id"]

        create_question_response = teacher_client.post(
            "/api/teacher/questions/",
            {
                "exam": exam_id,
                "question_text": "Add two numbers",
                "question_type": "coding",
                "problem_statement": "Read two integers and print their sum.",
                "input_format": "Two integers separated by space",
                "output_format": "Single integer",
                "constraints": "0 <= a,b <= 10^6",
                "sample_test_cases": [
                    {"input": "2 3", "output": "5"},
                    {"input": "10 20", "output": "30"},
                ],
                "coding_language": "python",
                "marks": "2.00",
                "negative_marks": "0.00",
                "order": 1,
            },
            format="json",
        )
        self.assertEqual(create_question_response.status_code, status.HTTP_201_CREATED, create_question_response.data)

        publish_exam_response = teacher_client.post(f"/api/teacher/exams/{exam_id}/publish/")
        self.assertEqual(publish_exam_response.status_code, status.HTTP_200_OK, publish_exam_response.data)

        student_access, _ = self._login(
            "/api/auth/student/login/",
            {"roll_number": self.student.roll_number, "password": _strong_password()},
        )
        student_client = self._authed_client(student_access)

        start_exam_response = student_client.post(f"/api/student/exams/{exam_id}/start/")
        self.assertEqual(start_exam_response.status_code, status.HTTP_201_CREATED, start_exam_response.data)
        attempt_id = start_exam_response.data["id"]

        answers_response = student_client.get(f"/api/student/attempts/{attempt_id}/answers/")
        self.assertEqual(answers_response.status_code, status.HTTP_200_OK, answers_response.data)
        coding_answer = answers_response.data[0]
        answer_id = coding_answer["id"]

        tampered_save_response = student_client.put(
            f"/api/student/answers/{answer_id}/",
            {
                "coding_language": "javascript",
                "code_answer": "a, b = map(int, input().split())\nprint(a + b)",
            },
            format="json",
        )
        self.assertEqual(
            tampered_save_response.status_code,
            status.HTTP_400_BAD_REQUEST,
            tampered_save_response.data,
        )

        save_code_response = student_client.put(
            f"/api/student/answers/{answer_id}/",
            {"code_answer": "a, b = map(int, input().split())\nprint(a + b)"},
            format="json",
        )
        self.assertEqual(save_code_response.status_code, status.HTTP_200_OK, save_code_response.data)

        tampered_run_response = student_client.post(
            f"/api/student/answers/{answer_id}/run-code/",
            {
                "language": "java",
                "code_answer": "a, b = map(int, input().split())\nprint(a + b)",
            },
            format="json",
        )
        self.assertEqual(
            tampered_run_response.status_code,
            status.HTTP_400_BAD_REQUEST,
            tampered_run_response.data,
        )

        run_code_response = student_client.post(
            f"/api/student/answers/{answer_id}/run-code/",
            {"code_answer": "a, b = map(int, input().split())\nprint(a + b)"},
            format="json",
        )
        self.assertEqual(run_code_response.status_code, status.HTTP_200_OK, run_code_response.data)
        self.assertEqual(run_code_response.data["result"]["passed_count"], 2)

        submit_response = student_client.post(f"/api/student/attempts/{attempt_id}/submit/")
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK, submit_response.data)

        evaluated_answer = Answer.objects.get(id=answer_id)
        self.assertEqual(str(evaluated_answer.marks_awarded), "2.00")
        self.assertTrue(evaluated_answer.is_evaluated)

    def test_god_delete_user_removes_row_from_database(self):
        god_access, _ = self._login(
            "/api/auth/god/login/",
            {"email": self.god.email, "password": _strong_password()},
        )
        god_client = self._authed_client(god_access)

        target = CustomUser.objects.create_user(
            email="delete-me@testify.local",
            full_name="Delete Me",
            password=_strong_password(),
            role="student",
            organization=self.org,
            department=self.department,
            course=self.course,
            roll_number="S-DEL-001",
            batch_year="2026",
        )

        response = god_client.delete(f"/api/god/users/{target.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, getattr(response, "data", None))
        self.assertFalse(CustomUser.objects.filter(id=target.id).exists())
        self.assertFalse(CustomUser.objects.filter(email__iexact="delete-me@testify.local").exists())

    def test_god_delete_organization_removes_row_from_database(self):
        god_access, _ = self._login(
            "/api/auth/god/login/",
            {"email": self.god.email, "password": _strong_password()},
        )
        god_client = self._authed_client(god_access)

        org = Organization.objects.create(
            name="Delete Org",
            email="delete-org@testify.local",
            plan="free",
            is_active=True,
        )
        member = CustomUser.objects.create_user(
            email="delete-org-member@testify.local",
            full_name="Delete Org Member",
            password=_strong_password(),
            role="admin",
            organization=org,
            is_staff=True,
        )

        response = god_client.delete(f"/api/god/organizations/{org.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, getattr(response, "data", None))
        self.assertFalse(Organization.objects.filter(id=org.id).exists())
        self.assertFalse(CustomUser.objects.filter(id=member.id).exists())


@override_settings(RATELIMIT_ENABLE=True)
class RateLimiterProtectionTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.org = Organization.objects.create(
            name="Rate Limit Org",
            email="ratelimit-org@testify.local",
            plan="free",
            is_active=True,
        )
        self.admin = CustomUser.objects.create_user(
            email="ratelimit-admin@testify.local",
            full_name="Rate Limit Admin",
            password=_strong_password(),
            role="admin",
            organization=self.org,
            is_staff=True,
        )

    def test_login_rate_limit_blocks_bruteforce_pattern(self):
        statuses = []
        for _ in range(6):
            response = self.client.post(
                "/api/auth/admin/login/",
                {"email": self.admin.email, "password": "WrongPass@123"},
                format="json",
            )
            statuses.append(response.status_code)

        self.assertIn(status.HTTP_400_BAD_REQUEST, statuses)
        self.assertIn(status.HTTP_403_FORBIDDEN, statuses)
