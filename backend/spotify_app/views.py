from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SpotifySong, SoundCloudSong
from .serializers import SpotifySongSerializer, SoundCloudSongSerializer
import requests
import os
import re
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from urllib.parse import quote
import time
from rest_framework import status
import threading
import yt_dlp

def download_soundcloud_track(url, title, artist, soundcloud_song_id):
    """Download SoundCloud track using yt-dlp in background"""
    try:
        soundcloud_song = SoundCloudSong.objects.get(id=soundcloud_song_id)
        soundcloud_song.download_status = 'downloading'
        soundcloud_song.download_progress = 0
        soundcloud_song.save()
        
        # Use /downloads as the container path (mapped to host via volume)
        download_path = '/downloads'
        
        # Ensure download directory exists
        os.makedirs(download_path, exist_ok=True)
        
        # Progress hook to update database
        def progress_hook(d):
            if d['status'] == 'downloading':
                try:
                    # Calculate percentage (0-90% for download, 90-100% for conversion)
                    downloaded = d.get('downloaded_bytes', 0)
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    
                    if total > 0:
                        # Scale download progress to 0-90%
                        progress = int((downloaded / total) * 90)
                        # Update database
                        soundcloud_song.download_progress = progress
                        soundcloud_song.save(update_fields=['download_progress'])
                except Exception as e:
                    print(f"Error updating progress: {e}")
            elif d['status'] == 'finished':
                # Download finished, conversion starting (90%)
                soundcloud_song.download_progress = 90
                soundcloud_song.save(update_fields=['download_progress'])
        
        # Post-processing hook to track conversion
        def postprocessor_hook(d):
            if d['status'] == 'started':
                soundcloud_song.download_progress = 90
                soundcloud_song.save(update_fields=['download_progress'])
            elif d['status'] == 'processing':
                soundcloud_song.download_progress = 95
                soundcloud_song.save(update_fields=['download_progress'])
            elif d['status'] == 'finished':
                soundcloud_song.download_progress = 100
                soundcloud_song.save(update_fields=['download_progress'])
        
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(download_path, f'{artist} - {title}.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
            'quiet': True,
            'no_warnings': True,
            'progress_hooks': [progress_hook],
            'postprocessor_hooks': [postprocessor_hook],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            print(f"Successfully downloaded: {artist} - {title}")
        
        # Fix file permissions (666 = rw-rw-rw-)
        # This allows the host user to read/write the file
        try:
            download_file = os.path.join(download_path, f'{artist} - {title}.mp3')
            if os.path.exists(download_file):
                os.chmod(download_file, 0o666)
        except Exception as e:
            print(f"Warning: Could not change permissions: {e}")
            
        # Mark as completed
        soundcloud_song.download_status = 'completed'
        soundcloud_song.download_progress = 100
        soundcloud_song.save()
            
    except Exception as e:
        print(f"Error downloading {artist} - {title}: {e}")
        try:
            soundcloud_song.download_status = 'failed'
            soundcloud_song.save()
        except:
            pass

def get_soundcloud_client_id():
    """Fetch a fresh SoundCloud client_id from the public web app."""
    try:
        homepage = requests.get("https://soundcloud.com")
        # Find JavaScript bundles
        js_urls = re.findall(r'src="(https://a-v2\.sndcdn\.com/assets/[^"]+\.js)"', homepage.text)
        for js_url in js_urls:
            js_code = requests.get(js_url).text
            match = re.search(r'client_id:"([a-zA-Z0-9]+)"', js_code)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Error getting SoundCloud client_id: {e}")
    return None

def search_soundcloud(title, artist, limit=5, max_retries=3, initial_delay=1):
    """
    Search SoundCloud tracks with retries.
    initial_delay: starting delay in seconds
    max_retries: maximum number of retry attempts
    """
    def try_search():
        client_id = get_soundcloud_client_id()
        if not client_id:
            return None

        search_text = f"{title} {artist}"
        params = {
            "q": search_text,
            "client_id": client_id,
            "limit": limit
        }
        
        url = "https://api-v2.soundcloud.com/search/tracks"
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json().get('collection', [])

    # Try up to max_retries times with exponential backoff
    for attempt in range(max_retries):
        try:
            tracks = try_search()
            if tracks is not None:
                matches = []
                for track in tracks:
                    matches.append({
                        'id': track.get('id'),
                        'title': track.get('title', ''),
                        'artist': track.get('user', {}).get('username', ''),
                        'icon': track.get('artwork_url', ''),
                        'duration_ms': track.get('duration', 0),
                        'url': track.get('permalink_url', ''),
                        'stream_url': track.get('stream_url', '')
                    })
                return matches
        except Exception as e:
            delay = initial_delay * (2 ** attempt)  # exponential backoff
            print(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
            continue
    
    # If we get here, all retries failed
    return None

def get_spotify_access_token():
    client_id = os.getenv('SPOTIFY_CLIENT_ID')
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
    token_url = 'https://accounts.spotify.com/api/token'
    
    response = requests.post(token_url, {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
    })
    
    if response.status_code == 200:
        return response.json().get('access_token')
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_spotify_songs(request):
    # Get pagination parameters from query string
    page = int(request.GET.get('page', 0))
    page_size = int(request.GET.get('page_size', 15))
    
    # Get total count
    total_count = SpotifySong.objects.filter(is_saved=True).count()
    
    # Calculate offset
    offset = page * page_size
    
    # Get paginated songs, ordered by most recent first
    songs = SpotifySong.objects.filter(is_saved=True).order_by('-saved_at')[offset:offset + page_size]
    serializer = SpotifySongSerializer(songs, many=True)
    
    return Response({
        'songs': serializer.data,
        'total': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count + page_size - 1) // page_size  # Ceiling division
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_new_spotify_songs(request):
    # Get Spotify playlist songs
    playlist_id = os.getenv('SPOTIFY_PLAYLIST_ID')
    access_token = get_spotify_access_token()
    
    if not access_token:
        return Response({'error': 'Unable to retrieve Spotify access token'}, status=400)

    url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    try:
        # First, get total number of tracks
        response = requests.get(
            url, 
            headers=headers, 
            params={"limit": 1}
        )
        response.raise_for_status()
        total_tracks = response.json()['total']

        # Fetch tracks from newest, stopping when we hit an existing song
        target_new_songs = 15
        batch_size = 50  # Fetch in batches for efficiency
        processed_count = 0
        
        while processed_count < total_tracks:
            # Calculate offset for the latest unprocessed tracks
            offset = max(0, total_tracks - processed_count - batch_size)
            limit = min(batch_size, total_tracks - processed_count)
            
            # Fetch tracks
            response = requests.get(
                url,
                headers=headers,
                params={
                    "limit": limit,
                    "offset": offset,
                    "fields": "items(track(id,name,artists,album(images)),added_at)"
                }
            )
            response.raise_for_status()
            
            # Get tracks and reverse them (newest first)
            spotify_tracks = list(reversed(response.json().get('items', [])))
            
            # Process each track
            for item in spotify_tracks:
                track = item.get('track', {})
                spotify_id = track.get('id')
                added_at = item.get('added_at')  # Get the added_at timestamp from Spotify
                
                if not spotify_id:
                    continue
                
                # Check if song already exists in database
                if SpotifySong.objects.filter(spotify_id=spotify_id, is_saved=False).exists():
                    # Stop when we hit an existing song
                    # Return songs with is_saved=False
                    new_songs = SpotifySong.objects.filter(is_saved=False).order_by('-added_at')[:target_new_songs]
                    serializer = SpotifySongSerializer(new_songs, many=True)
                    return Response(serializer.data)
                
                # Create new song with is_saved=False
                if not SpotifySong.objects.filter(spotify_id=spotify_id).exists():
                    SpotifySong.objects.create(
                        spotify_id=spotify_id,
                        title=track.get('name', ''),
                        artist=', '.join(artist['name'] for artist in track.get('artists', [])),
                        icon=track.get('album', {}).get('images', [{}])[0].get('url'),
                        is_saved=False,
                        added_at=added_at  # Store the Spotify added_at timestamp
                    )
            
            processed_count += limit
        
        # If we processed all tracks without hitting an existing one,
        # return the newest songs with is_saved=False
        new_songs = SpotifySong.objects.filter(is_saved=False).order_by('-added_at')[:target_new_songs]
        serializer = SpotifySongSerializer(new_songs, many=True)
        return Response(serializer.data)
        
    except requests.RequestException as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_spotify_song(request, spotify_id):
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
        
        song_data = {
            'spotify_id': track.get('id'),
            'title': title,
            'artist': artist,
            'icon': track.get('album', {}).get('images', [{}])[0].get('url'),
            'preview_url': track.get('preview_url'),
            'duration_ms': track.get('duration_ms'),
            'album_name': track.get('album', {}).get('name'),
            'release_date': track.get('album', {}).get('release_date'),
            'soundcloud_matches': soundcloud_matches,
            'soundcloud_error': soundcloud_matches is None  # Indicate if all retries failed
        }
            
        return Response(song_data)
        
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
            
            # Delete the downloaded file if it exists
            try:
                download_path = '/downloads'
                download_file = os.path.join(download_path, f'{soundcloud_song.artist} - {soundcloud_song.title}.mp3')
                if os.path.exists(download_file):
                    os.remove(download_file)
                    print(f"Deleted file: {download_file}")
            except Exception as e:
                print(f"Warning: Could not delete file: {e}")
            
            soundcloud_song.delete()
        except SoundCloudSong.DoesNotExist:
            pass
        
        # Mark Spotify song as not saved and clear saved_at
        spotify_song.is_saved = False
        spotify_song.saved_at = None
        spotify_song.save()
        
        return Response({
            'success': True,
            'message': 'SoundCloud match deleted successfully'
        }, status=200)
        
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Spotify song not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_song_in_playlist(request, spotify_id):
    """Check if a song still exists in the Spotify playlist, delete from DB if not"""
    try:
        spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        
        # Check if song is in the playlist
        playlist_id = os.getenv('SPOTIFY_PLAYLIST_ID')
        access_token = get_spotify_access_token()
        
        if not access_token or not playlist_id:
            return Response({'error': 'Unable to access Spotify API'}, status=500)
        
        url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {'fields': 'items(track(id))'}
        
        # Search through all tracks in the playlist
        offset = 0
        limit = 100
        found = False
        
        while True:
            params['offset'] = offset
            params['limit'] = limit
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            items = response.json().get('items', [])
            if not items:
                break
            
            # Check if our song is in this batch
            for item in items:
                track = item.get('track', {})
                if track and track.get('id') == spotify_id:
                    found = True
                    break
            
            if found:
                break
            
            offset += limit
            
            # Safety check to avoid infinite loop
            if offset > 10000:
                break
        
        if found:
            return Response({
                'exists': True,
                'message': 'Song is still in the playlist'
            }, status=200)
        else:
            # Song not found in playlist, delete from database
            spotify_song.delete()
            return Response({
                'exists': False,
                'deleted': True,
                'message': 'Song not found in playlist, removed from database'
            }, status=200)
        
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Spotify song not found in database'}, status=404)
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
                'soundcloud_data': serializer.data
            }, status=200)
        except SoundCloudSong.DoesNotExist:
            return Response({
                'has_match': False,
                'download_status': None,
                'download_progress': 0
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