# backend/project/views.py

from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
import django_filters.rest_framework

from .models import Thread, Post
from .serializers import UserSerializer, ThreadSerializer, PostSerializer

User = get_user_model()
DEFAULT_AVATAR_NAME = "avatars/default.jpg"


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer

    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = {
        "username": ["exact", "iexact"],
        "email": ["exact", "iexact"],
    }

    search_fields = ["^username"]
    ordering_fields = ["username", "id"]

    
    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]

        if self.action in ("list", "retrieve", "update", "partial_update"):
            return [permissions.IsAuthenticated()]

        if self.action == "destroy":
            return [permissions.IsAdminUser()]

        return [permissions.IsAuthenticated()]

    @action(
        detail=True,
        methods=["post"],
        url_path="avatar",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[permissions.IsAuthenticated],
    )
    def set_avatar(self, request, pk=None):
        user = self.get_object()
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

    @set_avatar.mapping.delete
    def delete_avatar(self, request, pk=None):
        user = self.get_object()

        old_pp = user.profilPicture
        if old_pp and old_pp.name != DEFAULT_AVATAR_NAME:
            old_pp.delete(save=False)

        user.profilPicture = DEFAULT_AVATAR_NAME
        user.save()

        url = request.build_absolute_uri(user.profilPicture.url)
        return Response({"profilPicture": url}, status=status.HTTP_200_OK)


class ThreadViewSet(viewsets.ModelViewSet):
    serializer_class = ThreadSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = {
        "name": ["exact", "iexact"],
    }

    search_fields = ["^name"]
    ordering_fields = ["name", "created_at", "id"]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Thread.objects.all().order_by("-created_at")

        return Thread.objects.filter(members=user).order_by("-created_at")


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Post.objects.all().order_by("-id")

        return Post.objects.filter(thread__members=user).order_by("-id")