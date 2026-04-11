from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attempts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="answer",
            name="code_answer",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="answer",
            name="execution_result",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
