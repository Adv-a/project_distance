from rest_framework import serializers
from .models import User, Thread, Post

class MiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "profilPicture"]

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "profilPicture", "password"]
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

class ThreadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Thread
        fields = ["id", "name", "members", "created_at"]
        read_only_fields = ["id", "created_at"]

class PostSerializer(serializers.ModelSerializer):
    tags = serializers.MultipleChoiceField(
        choices=Post.PostTag.choices,
        required=False
    )

    class Meta:
        model = Post
        fields = ["id", "tags", "group", "sender", "message", "image_content", "liked", "posted"]
        read_only_fields = ["id"]