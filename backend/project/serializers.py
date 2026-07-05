from rest_framework import serializers
from .models import User, Thread, Post

class MiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "profilPicture", "date_joined", "last_login"]

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

class ThreadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Thread
        fields = ["name", "members", "created_at", "posts"]
        read_only_fields = ["created_at"]

class PostSerializer(serializers.ModelSerializer):
    tags = serializers.MultipleChoiceField(
        choices=Post.PostTag.choices,
        required=False
    )

    class Meta:
        model = Post
        fields = ["tags", "sender", "message", "image_content", "liked", "posted"]
        read_only_fields = ["id"]