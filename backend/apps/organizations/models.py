import uuid

from django.db import models
from slugify import slugify


class Organization(models.Model):
    PLAN_CHOICES = [
        ("free", "Free"),
        ("pro", "Pro"),
        ("enterprise", "Enterprise"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=250)
    email = models.EmailField(unique=True)
    logo = models.ImageField(upload_to="org_logos/", null=True, blank=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.plan})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exclude(id=self.id).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"
            self.slug = slug
        super().save(*args, **kwargs)
