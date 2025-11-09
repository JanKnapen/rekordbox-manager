"""
SoundCloud matching and download related views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import SpotifySong, SoundCloudSong, PlaylistSong
from ..serializers import SoundCloudSongSerializer
from .utils import get_spotify_access_token, search_soundcloud, download_soundcloud_track
import requests
import os
import threading
from datetime import datetime


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_soundcloud_matches(request, spotify_id):
    """Get SoundCloud matches for a Spotify song"""
    access_token = get_spotify_access_token()
    
    if not access_token:
        return Response({'error': 'Unable to retrieve Spotify access token'}, status=400)

    url = f'https://api.spotify.com/v1/tracks/{spotify_id}'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        track = response.json()
        
        # Get basic song info
        title = track.get('name', '')
        artist = ', '.join(artist['name'] for artist in track.get('artists', []))
        
        # Check if this song has a saved SoundCloud match
        try:
            spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
            if spotify_song.is_saved:
                # Try to get the saved SoundCloud match
                try:
                    soundcloud_song = SoundCloudSong.objects.get(spotify_song=spotify_song)
                    soundcloud_matches = [{
                        'id': soundcloud_song.soundcloud_id,
                        'title': soundcloud_song.title,
                        'artist': soundcloud_song.artist,
                        'icon': soundcloud_song.icon,
                        'duration_ms': soundcloud_song.duration_ms,
                        'url': soundcloud_song.url,
                        'stream_url': soundcloud_song.stream_url
                    }]
                except SoundCloudSong.DoesNotExist:
                    # If no SoundCloud match saved, search for matches
                    soundcloud_matches = search_soundcloud(title, artist)
            else:
                # Song exists but not saved, search for matches
                soundcloud_matches = search_soundcloud(title, artist)
        except SpotifySong.DoesNotExist:
            # Song doesn't exist in DB, search for matches
            soundcloud_matches = search_soundcloud(title, artist)
        
        return Response({
            'soundcloud_matches': soundcloud_matches,
            'soundcloud_error': soundcloud_matches is None  # Indicate if all retries failed
        })
        
    except requests.RequestException as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_soundcloud_match(request):
    """Save a SoundCloud match for a Spotify song"""
    spotify_id = request.data.get('spotify_id')
    soundcloud_data = request.data.get('soundcloud_match')
    
    if not spotify_id or not soundcloud_data:
        return Response({'error': 'Missing required data'}, status=400)
    
    try:
        # Try to get existing Spotify song first
        try:
            spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        except SpotifySong.DoesNotExist:
            # If song doesn't exist, we need to fetch added_at from Spotify
            # This shouldn't normally happen, but we handle it just in case
            playlist_id = os.getenv('SPOTIFY_PLAYLIST_ID')
            access_token = get_spotify_access_token()
            
            if access_token:
                url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
                headers = {'Authorization': f'Bearer {access_token}'}
                params = {'fields': 'items(track(id),added_at)'}
                
                # Search for this track in the playlist to get its added_at
                response = requests.get(url, headers=headers, params=params)
                response.raise_for_status()
                items = response.json().get('items', [])
                
                added_at_value = None
                for item in items:
                    if item.get('track', {}).get('id') == spotify_id:
                        added_at_value = item.get('added_at')
                        break
                
                if not added_at_value:
                    # Fallback to current time if we can't find it
                    added_at_value = datetime.now().isoformat()
            else:
                added_at_value = datetime.now().isoformat()
            
            # Create the Spotify song
            spotify_song = SpotifySong.objects.create(
                spotify_id=spotify_id,
                title=request.data.get('spotify_title', ''),
                artist=request.data.get('spotify_artist', ''),
                icon=request.data.get('spotify_icon', ''),
                added_at=added_at_value,
                is_saved=False
            )
        
        # Create or update the SoundCloud song
        soundcloud_song, created = SoundCloudSong.objects.update_or_create(
            spotify_song=spotify_song,
            defaults={
                'soundcloud_id': str(soundcloud_data.get('id')),
                'title': soundcloud_data.get('title', ''),
                'artist': soundcloud_data.get('artist', ''),
                'icon': soundcloud_data.get('icon', ''),
                'duration_ms': soundcloud_data.get('duration_ms', 0),
                'url': soundcloud_data.get('url', ''),
                'stream_url': soundcloud_data.get('stream_url', ''),
                'download_status': 'pending',
                'download_progress': 0
            }
        )
        
        # Mark Spotify song as saved and set saved_at timestamp
        spotify_song.is_saved = True
        spotify_song.saved_at = datetime.now()
        spotify_song.save()
        
        # Start download in background thread
        download_thread = threading.Thread(
            target=download_soundcloud_track,
            args=(soundcloud_data.get('url', ''), soundcloud_song.title, soundcloud_song.artist, soundcloud_song.id)
        )
        download_thread.daemon = True
        download_thread.start()
        
        return Response({
            'success': True,
            'message': 'SoundCloud match saved successfully'
        }, status=201)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_soundcloud_match(request, spotify_id):
    """Delete the SoundCloud match for a Spotify song and mark it as not saved"""
    try:
        spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        
        # Delete the associated SoundCloud song if it exists
        try:
            soundcloud_song = SoundCloudSong.objects.get(spotify_song=spotify_song)
            
            # Delete the downloaded file from main downloads folder
            try:
                download_path = '/downloads'
                download_file = os.path.join(download_path, f'{soundcloud_song.artist} - {soundcloud_song.title}.mp3')
                if os.path.exists(download_file):
                    os.remove(download_file)
                    print(f"Deleted file: {download_file}")
            except Exception as e:
                print(f"Warning: Could not delete file: {e}")
            
            # Delete files from playlist directories if song is in playlists
            if spotify_song.in_playlist:
                playlist_songs = PlaylistSong.objects.filter(spotify_song=spotify_song).select_related('playlist')
                for ps in playlist_songs:
                    try:
                        playlist_dir = os.path.join(download_path, ps.playlist.name)
                        playlist_file = os.path.join(playlist_dir, f'{soundcloud_song.artist} - {soundcloud_song.title}.mp3')
                        if os.path.exists(playlist_file):
                            os.remove(playlist_file)
                            print(f"Deleted file from playlist: {playlist_file}")
                    except Exception as e:
                        print(f"Warning: Could not delete file from playlist: {e}")
            
            soundcloud_song.delete()
        except SoundCloudSong.DoesNotExist:
            pass
        
        # Remove song from all playlists
        PlaylistSong.objects.filter(spotify_song=spotify_song).delete()
        
        # Mark Spotify song as not saved, not in playlist, and clear saved_at
        spotify_song.is_saved = False
        spotify_song.saved_at = None
        spotify_song.in_playlist = False
        spotify_song.save()
        
        return Response({
            'success': True,
            'message': 'SoundCloud match deleted successfully'
        }, status=200)
        
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Spotify song not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_download_status(request, spotify_id):
    """Get download status for a SoundCloud match"""
    try:
        spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        
        try:
            soundcloud_song = SoundCloudSong.objects.get(spotify_song=spotify_song)
            serializer = SoundCloudSongSerializer(soundcloud_song)
            return Response({
                'has_match': True,
                'download_status': soundcloud_song.download_status,
                'download_progress': soundcloud_song.download_progress,
                'bpm': soundcloud_song.bpm,
                'key': soundcloud_song.key,
                'soundcloud_data': serializer.data
            }, status=200)
        except SoundCloudSong.DoesNotExist:
            return Response({
                'has_match': False,
                'download_status': None,
                'download_progress': 0,
                'bpm': None,
                'key': None
            }, status=200)
        
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Spotify song not found in database'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retry_download(request, spotify_id):
    """Retry a failed download"""
    try:
        spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        soundcloud_song = SoundCloudSong.objects.get(spotify_song=spotify_song)
        
        # Only allow retry if status is failed
        if soundcloud_song.download_status != 'failed':
            return Response({
                'error': 'Download can only be retried when status is failed'
            }, status=400)
        
        # Reset status to pending
        soundcloud_song.download_status = 'pending'
        soundcloud_song.download_progress = 0
        soundcloud_song.save()
        
        # Start download in background thread
        download_thread = threading.Thread(
            target=download_soundcloud_track,
            args=(soundcloud_song.url, soundcloud_song.title, soundcloud_song.artist, soundcloud_song.id)
        )
        download_thread.daemon = True
        download_thread.start()
        
        return Response({
            'success': True,
            'message': 'Download retry started'
        }, status=200)
        
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Spotify song not found in database'}, status=404)
    except SoundCloudSong.DoesNotExist:
        return Response({'error': 'No SoundCloud match found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
