from django.urls import path
from .views import get_spotify_songs

urlpatterns = [
    path('songs/', get_spotify_songs, name='get_spotify_songs'),
]