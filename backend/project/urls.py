from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import UserViewSet, ThreadViewSet, PostViewSet
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
]

urlpatterns += router.urls
