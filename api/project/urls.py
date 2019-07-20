"""histobot URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers

import coreapp.views as views


router = routers.DefaultRouter()
router.register(r'models', views.MLModelsViewSet)
router.register(r'datasets', views.DatasetsViewSet)
router.register(r'images', views.ImagesViewSet)
router.register(r'label-images', views.LabelImagesViewSet)
router.register(r'analyses', views.AnalysesViewSet)


urlpatterns = [
    path('accounts/', include('django.contrib.auth.urls')),
    path('api/v1/', include([
        path('self/', views.CurrentUserView.as_view(), name='self'),
    ] + router.urls)),
    path('system/admin/', admin.site.urls),
    re_path(r'^_nested_admin/', include('nested_admin.urls')),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    re_path(r'^', views.FrontendAppView.as_view(), name='index'),
]
