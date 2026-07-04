from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie

def health(request):
    return JsonResponse({"status": "ok"})

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("backend.project.urls")),
    path("api/csrf/", csrf),
    path("health/", health),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)