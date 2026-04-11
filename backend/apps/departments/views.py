from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.departments import services
from apps.departments.serializers import CourseSerializer, DepartmentSerializer


class DepartmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        departments = services.list_departments(request.user)
        return Response(DepartmentSerializer(departments, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = DepartmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = services.create_department(request.user, serializer.validated_data)
        return Response(DepartmentSerializer(department).data, status=status.HTTP_201_CREATED)


class DepartmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, department_id):
        department = services.update_department(request.user, department_id, request.data)
        return Response(DepartmentSerializer(department).data, status=status.HTTP_200_OK)

    def delete(self, request, department_id):
        services.delete_department(request.user, department_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        courses = services.list_courses(request.user)
        return Response(CourseSerializer(courses, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CourseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = services.create_course(request.user, serializer.validated_data)
        return Response(CourseSerializer(course).data, status=status.HTTP_201_CREATED)


class CourseDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, course_id):
        services.delete_course(request.user, course_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
