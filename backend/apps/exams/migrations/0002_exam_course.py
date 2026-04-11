from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("departments", "0001_initial"),
        ("exams", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="course",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="exams",
                to="departments.course",
            ),
        ),
    ]
