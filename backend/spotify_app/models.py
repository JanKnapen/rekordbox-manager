from django.db import models

class SpotifySong(models.Model):
    icon = models.URLField(max_length=500, blank=True, null=True)
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    spotify_id = models.CharField(max_length=255, unique=True)
    is_saved = models.BooleanField(default=False)  # Track if song has been matched
    added_at = models.DateTimeField()  # When song was added to Spotify playlist
    saved_at = models.DateTimeField(null=True, blank=True)  # When the song was saved
    in_playlist = models.BooleanField(default=False)  # Track if song is already in a playlist

    class Meta:
        ordering = ['-saved_at']  # newest first

    def __str__(self):
        return f"{self.title} - {self.artist}"

class SoundCloudSong(models.Model):
    DOWNLOAD_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('downloading', 'Downloading'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    spotify_song = models.OneToOneField(SpotifySong, on_delete=models.CASCADE, related_name='soundcloud_match')
    soundcloud_id = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    icon = models.URLField(max_length=500, blank=True, null=True)
    duration_ms = models.IntegerField()
    url = models.URLField(max_length=500)
    stream_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    download_status = models.CharField(max_length=20, choices=DOWNLOAD_STATUS_CHOICES, default='pending')
    download_progress = models.IntegerField(default=0)  # 0-100

    def __str__(self):
        return f"{self.title} - {self.artist} (SoundCloud)"

class Playlist(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name

class PlaylistSong(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name='songs')
    spotify_song = models.ForeignKey(SpotifySong, on_delete=models.CASCADE)
    position = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['position']
        unique_together = ['playlist', 'spotify_song']
    
    def __str__(self):
        return f"{self.playlist.name} - {self.spotify_song.title}"