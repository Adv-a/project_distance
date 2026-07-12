from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, Thread, Post


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "id",
        "username",
        "email",
        "is_staff",
        "is_superuser",
        "is_moderator",
        "is_active",
    )

    search_fields = ("username", "email")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")

    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Application", {"fields": ("profilPicture", "must_change_password")}),
    )

    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Application", {"fields": ("email", "profilPicture", "must_change_password")}),
    )

    @admin.display(boolean=True, description="Modérateur")
    def is_moderator(self, obj):
        return (
            obj.is_superuser
            or obj.is_staff
            or obj.groups.filter(name="moderators").exists()
        )


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at", "members_count", "posts_count")
    search_fields = ("name", "members__username")
    filter_horizontal = ("members",)

    def members_count(self, obj):
        return obj.members.count()

    members_count.short_description = "Membres"

    def posts_count(self, obj):
        return obj.posts.count()

    posts_count.short_description = "Posts"


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "thread", "sender", "message", "tags_display", "likes_count", "posted")
    search_fields = ("message", "sender__username", "thread__name")
    filter_horizontal = ("liked",)

    def tags_display(self, obj):
        return ", ".join(obj.tags or [])

    tags_display.short_description = "Tags"

    def likes_count(self, obj):
        return obj.liked.count()

    likes_count.short_description = "Likes"
