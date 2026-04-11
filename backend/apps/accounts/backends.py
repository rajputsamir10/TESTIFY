from django.contrib.auth.backends import ModelBackend

from apps.accounts.models import CustomUser


class RoleAwareModelBackend(ModelBackend):
    """Authenticate against non-unique emails by checking matching candidates."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = kwargs.get(CustomUser.USERNAME_FIELD, username)
        if email is None or password is None:
            return None

        normalized_email = str(email).strip().lower()
        candidates = CustomUser.objects.filter(email__iexact=normalized_email).order_by("created_at")

        for user in candidates:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user

        return None
