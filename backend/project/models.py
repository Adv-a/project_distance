# backend/project/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.conf import settings


class User(AbstractUser):
    profilPicture = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
        default="avatars/default.jpg",
    )
    must_change_password = models.BooleanField(default=False)


class Thread(models.Model):
    name = models.CharField(max_length=255)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="threads",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Post(models.Model):
    class PostTag(models.TextChoices):
        MESSAGE = "Message", "Message"
        IDEE = "Idee", "Idée"
        FILM = "Film", "Film"
        PHOTO = "Photo", "Photo"

    tags = ArrayField(
        base_field=models.CharField(
            max_length=10,
            choices=PostTag.choices,
        ),
        default=list,
        blank=True,
    )

    thread = models.ForeignKey(
        Thread,
        on_delete=models.CASCADE,
        related_name="posts",
        blank=True,
        null=True,
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_posts",
    )

    message = models.CharField(max_length=255, default="")

    image_content = models.ImageField(
        upload_to="image_content/",
        blank=True,
        null=True,
    )

    liked = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_posts",
        blank=True,
    )

    posted = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.message[:50]