from rest_framework.exceptions import NotFound

from apps.questions.models import Question


def get_question(user, question_id):
    queryset = Question.objects.prefetch_related("options")
    if user.role != "god":
        queryset = queryset.filter(organization_id=user.organization_id)

    question = queryset.filter(id=question_id).first()
    if not question:
        raise NotFound("Question not found.")
    return question


def list_question_options(user, question_id):
    question = get_question(user, question_id)
    return question.options.all().order_by("order")
