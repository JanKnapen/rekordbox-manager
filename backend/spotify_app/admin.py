from django.contrib import admin
from .models import SpotifySong, SoundCloudSong

@admin.register(SpotifySong)
class SpotifySongAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'spotify_id', 'is_saved', 'saved_at']
    list_filter = ['is_saved', 'saved_at']
    search_fields = ['title', 'artist', 'spotify_id']

@admin.register(SoundCloudSong)
class SoundCloudSongAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'soundcloud_id', 'spotify_song', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'artist', 'soundcloud_id']
