from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_id"] = str(user.id)
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["organization_id"] = str(user.organization.id) if user.organization else None
        token["organization_name"] = user.organization.name if user.organization else None
        token["plan"] = user.organization.plan if user.organization else None
        token["department_id"] = str(user.department.id) if user.department else None
        return token
