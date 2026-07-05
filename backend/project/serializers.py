from rest_framework import serializers
from .models import User, Thread, Post

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["username", "email", "profilPicture", "password", "threads", "date_joined", "last_login"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

class MiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "profilPicture"]

class PostSerializer(serializers.ModelSerializer):
    sender = MiniUserSerializer(read_only=True)

    thread_id = serializers.PrimaryKeyRelatedField(
        source="thread",
        queryset=Thread.objects.all(),
        write_only=True,
    )

    liked = MiniUserSerializer(many=True, read_only=True)

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
            "liked",
            "posted",
        ]
        read_only_fields = ["id", "sender", "liked"]

class ThreadSerializer(serializers.ModelSerializer):
    members = MiniUserSerializer(many=True, read_only=True)
    posts = PostSerializer(many=True, read_only=True)

    class Meta:
        model = Thread
        fields = [
            "id",
            "name",
            "members",
            "created_at",
            "posts",
        ]