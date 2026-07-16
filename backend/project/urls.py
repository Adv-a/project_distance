from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import UserViewSet, ThreadViewSet, PostViewSet, PostMediaFileView
from .auth_views import ChangePasswordView, CsrfView, LoginView, LogoutView, MeView

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"threads", ThreadViewSet, basename="thread")
router.register(r"posts", PostViewSet, basename="post")

urlpatterns = [
    path("auth/csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("post-media/<int:media_id>/file/", PostMediaFileView.as_view(), name="post-media-file",),
]

urlpatterns += router.urls
