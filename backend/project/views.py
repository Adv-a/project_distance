# backend/project/views.py
import secrets
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
import django_filters.rest_framework
from django.db.models import F
from .permissions import IsModerator, HasChangedInitialPassword, is_moderator
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

import json

from .models import Thread, Post, PostMedia
from .serializers import UserSerializer, ModeratorCreateUserSerializer, ThreadSerializer, PostSerializer

User = get_user_model()
DEFAULT_AVATAR_NAME = "avatars/default.jpg"

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")

    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = {
        "username": ["exact", "iexact"],
        "email": ["exact", "iexact"],
    }

    search_fields = ["^username", "^email"]
    ordering_fields = ["username", "email", "id"]

    def get_serializer_class(self):
        if self.action == "create":
            return ModeratorCreateUserSerializer

        return UserSerializer

    def get_permissions(self):
        if self.action in ["create", "reset_password"]:
            return [IsModerator()]

        if self.action == "destroy":
            return [permissions.IsAdminUser()]

        return [permissions.IsAuthenticated(), HasChangedInitialPassword()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if is_moderator(user):
            return qs

        return qs.filter(id=user.id)

    @action(
        detail=True,
        methods=["post"],
        url_path="reset-password",
        permission_classes=[IsModerator],
    )
    def reset_password(self, request, pk=None):
        user = self.get_object()

        temporary_password = secrets.token_urlsafe(12)

        user.set_password(temporary_password)
        user.must_change_password = True
        user.save()

        return Response(
            {
                "detail": "Mot de passe temporaire généré.",
                "user_id": user.id,
                "username": user.username,
                "temporary_password": temporary_password,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="avatar",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[permissions.IsAuthenticated],
    )
    def set_avatar(self, request, pk=None):
        user = self.get_object()

        if request.user.id != user.id and not is_moderator(request.user):
            raise PermissionDenied("Tu ne peux modifier que ton propre avatar.")

        file = request.FILES.get("avatar")

        if not file:
            return Response(
                {"detail": "Aucun fichier 'avatar' fourni."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_pp = user.profilPicture
        if old_pp and old_pp.name != DEFAULT_AVATAR_NAME:
            old_pp.delete(save=False)

        user.profilPicture = file
        user.save()

        url = request.build_absolute_uri(user.profilPicture.url)
        return Response({"profilPicture": url}, status=status.HTTP_200_OK)

class ThreadViewSet(viewsets.ModelViewSet):
    serializer_class = ThreadSerializer

    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = {
        "name": ["exact", "iexact", "icontains"],
    }

    search_fields = ["^name", "members__username"]
    ordering_fields = ["name", "created_at", "id"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsModerator()]

        return [permissions.IsAuthenticated(), HasChangedInitialPassword()]

    def get_queryset(self):
        user = self.request.user

        qs = (
            Thread.objects
            .prefetch_related("members", "posts", "posts__sender", "posts__liked")
            .order_by("-created_at")
        )

        if is_moderator(user):
            return qs.distinct()

        return qs.filter(members=user).distinct()

    def perform_create(self, serializer):
        thread = serializer.save()

        if thread.members.count() == 0:
            thread.members.add(self.request.user)

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user

        queryset = Post.objects.select_related(
            "sender",
            "thread",
        ).prefetch_related(
            "liked",
            "media",
        )

        if user.is_staff:
            return queryset.all().order_by("-posted", "-id")

        return queryset.filter(thread__members=user).order_by("-posted", "-id")

    def _check_can_edit_post(self, post):
        user = self.request.user

        if not user.is_staff and post.sender_id != user.id:
            raise PermissionDenied("Tu ne peux modifier que tes propres posts.")

    def _create_media_from_files(self, post):
        media_files = self.request.FILES.getlist("media_files")

        if not media_files:
            return

        existing_count = post.media.count()

        if existing_count + len(media_files) > 10:
            raise ValidationError("Tu peux avoir maximum 10 médias par post.")

        current_max_order = existing_count

        for index, file in enumerate(media_files):
            content_type = file.content_type or ""

            if content_type.startswith("image/"):
                media_type = PostMedia.MediaType.IMAGE
            elif content_type.startswith("video/"):
                media_type = PostMedia.MediaType.VIDEO
            else:
                raise ValidationError(
                    f"Type de fichier non supporté : {content_type}"
                )

            PostMedia.objects.create(
                post=post,
                file=file,
                media_type=media_type,
                order=current_max_order + index,
            )

    def _delete_requested_media(self, post):
        raw_value = self.request.data.get("delete_media_ids")

        if not raw_value:
            return

        try:
            media_ids = json.loads(raw_value)
        except json.JSONDecodeError:
            raise ValidationError("delete_media_ids doit être une liste JSON.")

        if not isinstance(media_ids, list):
            raise ValidationError("delete_media_ids doit être une liste.")

        post.media.filter(id__in=media_ids).delete()

    def perform_create(self, serializer):
        user = self.request.user
        thread = serializer.validated_data["thread"]

        if not user.is_staff and not thread.members.filter(id=user.id).exists():
            raise PermissionDenied("Tu ne peux pas poster dans ce thread.")

        post = serializer.save(sender=user)

        self._create_media_from_files(post)

    def perform_update(self, serializer):
        post = serializer.instance

        self._check_can_edit_post(post)

        updated_post = serializer.save(
            sender=post.sender,
            thread=post.thread,
        )

        self._delete_requested_media(updated_post)
        self._create_media_from_files(updated_post)

    def perform_destroy(self, instance):
        self._check_can_edit_post(instance)
        instance.delete()