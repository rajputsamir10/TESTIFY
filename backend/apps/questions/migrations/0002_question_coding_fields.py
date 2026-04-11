from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="coding_language",
            field=models.CharField(
                choices=[("python", "Python")],
                default="python",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="question",
            name="constraints",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="question",
            name="input_format",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="question",
            name="output_format",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="question",
            name="problem_statement",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="question",
            name="sample_test_cases",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="question",
            name="question_type",
            field=models.CharField(
                choices=[("mcq", "MCQ"), ("subjective", "Subjective"), ("coding", "Coding")],
                default="mcq",
                max_length=20,
            ),
        ),
    ]
