from getpass import getpass

from django.core.management.base import BaseCommand

from apps.accounts.models import CustomUser


class Command(BaseCommand):
    help = "Create the God User (platform super admin)."

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, help="God user email")
        parser.add_argument("--full-name", type=str, help="God user full name")
        parser.add_argument("--password", type=str, help="God user password")

    def handle(self, *args, **options):
        email = (options.get("email") or input("God user email: ")).strip()
        full_name = (options.get("full_name") or input("Full name: ")).strip()
        password = (options.get("password") or getpass("Password: ")).strip()

        if not email or not full_name or not password:
            self.stdout.write(self.style.ERROR("email, full name, and password are required."))
            return

        if CustomUser.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING("God user already exists for this email."))
            return

        user = CustomUser.objects.create_superuser(
            email=email,
            full_name=full_name,
            password=password,
        )
        self.stdout.write(self.style.SUCCESS(f"God user created: {user.email}"))
