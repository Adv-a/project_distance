from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, Thread, Post


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("id", "username", "email", "is_staff", "is_superuser")
    search_fields = ("username", "email")
    list_filter = ("is_staff", "is_superuser", "is_active")


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("name",)
    filter_horizontal = ("members",)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "group", "sender", "message", "tags")
    search_fields = ("message", "sender__username", "group__name")
    list_filter = ("tags",)
    filter_horizontal = ("liked",)