from django.urls import path
from . import views

urlpatterns = [
    path('songs/', views.get_spotify_songs, name='get-songs'),
    path('new-songs/', views.get_new_spotify_songs, name='get-new-songs'),
    path('song/<str:spotify_id>/', views.get_spotify_song, name='get-spotify-song'),
    path('soundcloud-matches/<str:spotify_id>/', views.get_soundcloud_matches, name='get-soundcloud-matches'),
    path('save-match/', views.save_soundcloud_match, name='save-soundcloud-match'),
    path('delete-match/<str:spotify_id>/', views.delete_soundcloud_match, name='delete-soundcloud-match'),
    path('check-song/<str:spotify_id>/', views.check_song_in_playlist, name='check-song-in-playlist'),
    path('download-status/<str:spotify_id>/', views.get_download_status, name='get-download-status'),
    path('retry-download/<str:spotify_id>/', views.retry_download, name='retry-download'),
    # Playlist management
    path('playlists/', views.get_playlists, name='get-playlists'),
    path('playlists/create/', views.create_playlist, name='create-playlist'),
    path('playlists/<int:playlist_id>/songs/', views.get_playlist_songs, name='get-playlist-songs'),
    path('playlists/<int:playlist_id>/add-song/', views.add_song_to_playlist, name='add-song-to-playlist'),
    path('playlists/<int:playlist_id>/remove-song/<str:spotify_id>/', views.remove_song_from_playlist, name='remove-song-from-playlist'),
    # Rekordbox sync
    path('rekordbox/sync/', views.sync_rekordbox, name='sync-rekordbox'),
]