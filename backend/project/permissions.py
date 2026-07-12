from rest_framework import permissions


def is_moderator(user):
    return (
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or user.is_staff
            or user.groups.filter(name="moderators").exists()
        )
    )


class IsModerator(permissions.BasePermission):
    message = "Accès réservé aux modérateurs."

    def has_permission(self, request, view):
        return is_moderator(request.user)


class HasChangedInitialPassword(permissions.BasePermission):
    message = "Tu dois changer ton mot de passe avant d'utiliser l'application."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return not getattr(user, "must_change_password", False)
