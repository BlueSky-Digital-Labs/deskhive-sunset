from django.urls import path

from .views import UtilisationView

urlpatterns = [
    path('admin/utilisation', UtilisationView.as_view(), name='admin-utilisation'),
]
