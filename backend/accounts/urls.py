from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf, name='api-csrf'),
    path('login/', views.LoginView.as_view(), name='login'),
]