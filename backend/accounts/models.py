from django.contrib.auth.models import AbstractUser
from django.db import models

class UserAccount(AbstractUser):
    """
    Minimal custom user model. Add extra fields here if needed.
    """
    # example extra field (optional)
    # display_name = models.CharField(max_length=150, blank=True)
    pass