# backend/project/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.conf import settings
from django.utils import timezone


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
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_posts",
    )

    message = models.CharField(max_length=255, default="")

    liked = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_posts",
        blank=True,
    )

    posted = models.DateTimeField(default=timezone.now)

    image_content = models.ImageField(
        upload_to="image_content/",
        blank=True,
        null=True,
    )

    video_content = models.FileField(
        upload_to="video_content/",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-posted", "-id"]

    def __str__(self):
        return self.message[:50]

class PostMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Vidéo"

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="media",
    )

    file = models.FileField(
        upload_to="post_media/",
    )

    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
    )

    order = models.PositiveIntegerField(default=0)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.media_type} for post {self.post_id}"