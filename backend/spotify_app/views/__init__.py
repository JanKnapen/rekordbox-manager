"""
Views package - organized by functionality
"""
# Spotify views
from .spotify_views import (
    get_spotify_songs,
    get_new_spotify_songs,
    get_spotify_song,
    check_song_in_playlist,
)

# SoundCloud views
from .soundcloud_views import (
    get_soundcloud_matches,
    save_soundcloud_match,
    delete_soundcloud_match,
    get_download_status,
    retry_download,
)

# Playlist views
from .playlist_views import (
    get_playlists,
    create_playlist,
    add_song_to_playlist,
    get_playlist_songs,
    remove_song_from_playlist,
)

# Export all views
__all__ = [
    # Spotify
    'get_spotify_songs',
    'get_new_spotify_songs',
    'get_spotify_song',
    'check_song_in_playlist',
    # SoundCloud
    'get_soundcloud_matches',
    'save_soundcloud_match',
    'delete_soundcloud_match',
    'get_download_status',
    'retry_download',
    # Playlist
    'get_playlists',
    'create_playlist',
    'add_song_to_playlist',
    'get_playlist_songs',
    'remove_song_from_playlist',
]
