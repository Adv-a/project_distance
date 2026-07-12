import secrets

from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Thread, Post, PostMedia

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    is_moderator = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "profilPicture",
            "last_login",
            "date_joined",
            "must_change_password",
            "is_moderator",
        ]
        read_only_fields = [
            "id",
            "last_login",
            "date_joined",
            "must_change_password",
            "is_moderator",
        ]

    def get_is_moderator(self, obj):
        return (
            obj.is_superuser
            or obj.is_staff
            or obj.groups.filter(name="moderators").exists()
        )


class MiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "profilPicture"]


class ModeratorCreateUserSerializer(serializers.ModelSerializer):
    temporary_password = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "profilPicture",
            "must_change_password",
            "temporary_password",
        ]
        read_only_fields = [
            "id",
            "must_change_password",
            "temporary_password",
        ]

    def create(self, validated_data):
        temporary_password = secrets.token_urlsafe(12)

        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            must_change_password=True,
        )
        user.set_password(temporary_password)
        user.save()

        self.temporary_password = temporary_password
        return user

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["temporary_password"] = getattr(self, "temporary_password", None)
        return data

class PostMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostMedia
        fields = [
            "id",
            "file",
            "media_type",
            "order",
        ]

class PostSerializer(serializers.ModelSerializer):
    sender = MiniUserSerializer(read_only=True)
    liked = MiniUserSerializer(many=True, read_only=True)
    media = PostMediaSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()

    thread_id = serializers.PrimaryKeyRelatedField(
        source="thread",
        queryset=Thread.objects.all(),
        write_only=True,
        required=False,
    )

    tags = serializers.MultipleChoiceField(
        choices=Post.PostTag.choices,
        required=False,
    )

    class Meta:
        model = Post
        fields = [
            "id",
            "thread_id",
            "tags",
            "sender",
            "message",
            "image_content",
            "video_content",
            "media",
            "liked",
            "posted",
            "can_edit",
        ]
        read_only_fields = [
            "id",
            "sender",
            "liked",
            "media",
            "can_edit",
        ]

    def get_can_edit(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        user = request.user

        return user.is_staff or obj.sender_id == user.id

class ThreadSerializer(serializers.ModelSerializer):
    members = MiniUserSerializer(many=True, read_only=True)

    member_ids = serializers.PrimaryKeyRelatedField(
        source="members",
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    posts = PostSerializer(many=True, read_only=True)

    class Meta:
        model = Thread
        fields = [
            "id",
            "name",
            "members",
            "member_ids",
            "created_at",
            "posts",
        ]
        read_only_fields = [
            "id",
            "members",
            "created_at",
            "posts",
        ]
