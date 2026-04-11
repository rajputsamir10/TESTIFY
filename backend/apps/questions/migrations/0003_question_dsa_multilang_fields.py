from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0002_question_coding_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="hidden_test_cases",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="question",
            name="memory_limit_mb",
            field=models.IntegerField(default=256),
        ),
        migrations.AddField(
            model_name="question",
            name="time_limit_seconds",
            field=models.IntegerField(default=3),
        ),
        migrations.AlterField(
            model_name="question",
            name="coding_language",
            field=models.CharField(
                blank=True,
                choices=[
                    ("python", "Python"),
                    ("javascript", "JavaScript"),
                    ("java", "Java"),
                    ("c", "C"),
                    ("cpp", "C++"),
                    ("html", "HTML/CSS"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="question",
            name="constraints",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="question",
            name="input_format",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="question",
            name="output_format",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="question",
            name="problem_statement",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="question",
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
    ]
