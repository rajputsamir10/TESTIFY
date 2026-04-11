from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications import services
from apps.notifications.serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = services.list_notifications(request.user)
        return Response(NotificationSerializer(notifications, many=True).data, status=status.HTTP_200_OK)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notif_id):
        notif = services.mark_read(request.user, notif_id)
        return Response(NotificationSerializer(notif).data, status=status.HTTP_200_OK)


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        result = services.mark_all_read(request.user)
        return Response(result, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"unread_count": services.unread_count(request.user)}, status=status.HTTP_200_OK)
