from django.urls import path

from apps.notifications.views import (
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view()),
    path("<uuid:notif_id>/read/", NotificationReadView.as_view()),
    path("read-all/", NotificationReadAllView.as_view()),
    path("unread-count/", NotificationUnreadCountView.as_view()),
]
