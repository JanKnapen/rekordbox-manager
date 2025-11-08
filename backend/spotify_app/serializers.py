from rest_framework import serializers
from .models import SpotifySong, SoundCloudSong

class SpotifySongSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpotifySong
        fields = ['id', 'icon', 'title', 'artist', 'added_at', 'saved_at', 'spotify_id', 'is_saved', 'in_playlist']

class SoundCloudSongSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoundCloudSong
        fields = ['id', 'spotify_song', 'soundcloud_id', 'title', 'artist', 'icon', 'duration_ms', 'url', 'stream_url', 'created_at', 'download_status', 'download_progress']