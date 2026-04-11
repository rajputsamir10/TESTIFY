from apps.results.models import Result


def list_results_for_exam(exam_id):
    return Result.objects.filter(exam_id=exam_id).select_related("student", "exam")
