from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField

class User(AbstractUser):
    profilPicture = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
        default="avatars/default.jpg",
    )

class Thread(models.Model):
    name = models.CharField(max_length=255)
    members = models.ManyToManyField(
        "User",
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

class Post(models.Model):
    class PostTag(models.TextChoices):
        MESSAGE = "Message", "Message"
        IDEE = "Idee", "Idée"
        FILM = "Film", "Film"
        PHOTO = "Photo", "Photo"

    tags = ArrayField(
        base_field=models.CharField(
            max_length=10,
            choices=PostTag.choices
        ),
        default=list,
        blank=True
    )
    group = models.ForeignKey(
        Thread,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="sender"
    )
    message = models.CharField(max_length=255, default="")
    image_content = models.ImageField(
        upload_to="image_content/",
        blank=True,
        null=True,
    )
    liked = models.ManyToManyField(User)
    posted = models.TextField(default="", blank=True)