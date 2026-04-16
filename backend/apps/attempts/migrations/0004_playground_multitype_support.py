from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attempts", "0003_playgroundsession_playgroundquestion_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="playgroundquestion",
            name="question_type",
            field=models.CharField(
                choices=[
                    ("mcq", "MCQ"),
                    ("subjective", "Subjective"),
                    ("coding", "Coding"),
                    ("dsa", "DSA Problem"),
                ],
                default="mcq",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="playgroundquestion",
            name="correct_option_index",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="expected_answer",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="coding_language",
            field=models.CharField(
                blank=True,
                choices=[
                    ("python", "Python"),
                    ("javascript", "JavaScript"),
                    ("java", "Java"),
                    ("c", "C"),
                    ("cpp", "C++"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="problem_statement",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="input_format",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="output_format",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="constraints",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="sample_test_cases",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="playgroundquestion",
            name="hidden_test_cases",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="playgroundanswer",
            name="text_answer",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundanswer",
            name="code_answer",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="playgroundanswer",
            name="execution_result",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
