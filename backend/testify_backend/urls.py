from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/god/", include("apps.god.urls")),
    path("api/admin/", include("apps.organizations.urls")),
    path("api/admin/", include("apps.departments.urls")),
    path("api/admin/", include("apps.accounts.admin_urls")),
    path("api/teacher/", include("apps.exams.urls")),
    path("api/student/", include("apps.attempts.urls")),
    path("api/questions/", include("apps.questions.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
