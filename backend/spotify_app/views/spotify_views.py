"""
Spotify API related views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import SpotifySong
from ..serializers import SpotifySongSerializer
from .utils import get_spotify_access_token
import requests
import os


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_spotify_songs(request):
    """Get saved Spotify songs with pagination"""
    # Get pagination parameters from query string
    page = int(request.GET.get('page', 0))
    page_size = int(request.GET.get('page_size', 15))
    exclude_in_playlist = request.GET.get('exclude_in_playlist', 'false').lower() == 'true'
    
    # Build query - optionally exclude songs already in playlists
    if exclude_in_playlist:
        query = SpotifySong.objects.filter(is_saved=True, in_playlist=False)
    else:
        query = SpotifySong.objects.filter(is_saved=True)
    
    # Get total count
    total_count = query.count()
    
    # Calculate offset
    offset = page * page_size
    
    # Get paginated songs, ordered by most recent first
    songs = query.order_by('-saved_at')[offset:offset + page_size]
    
    # Serialize with additional BPM and key data from SoundCloudSong
    songs_data = []
    for song in songs:
        song_dict = SpotifySongSerializer(song).data
        # Try to get BPM, key, and download status from related SoundCloudSong
        try:
            soundcloud_song = song.soundcloud_match
            song_dict['bpm'] = soundcloud_song.bpm
            song_dict['key'] = soundcloud_song.key
            song_dict['download_status'] = soundcloud_song.download_status
        except:
            song_dict['bpm'] = None
            song_dict['key'] = None
            song_dict['download_status'] = None
        songs_data.append(song_dict)
    
    return Response({
        'songs': songs_data,
        'total': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count + page_size - 1) // page_size  # Ceiling division
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_new_spotify_songs(request):
    """Get new songs from Spotify playlist that haven't been processed yet"""
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
    """Get detailed information about a specific Spotify song"""
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
        
        song_data = {
            'spotify_id': track.get('id'),
            'title': title,
            'artist': artist,
            'icon': track.get('album', {}).get('images', [{}])[0].get('url'),
            'preview_url': track.get('preview_url'),
            'duration_ms': track.get('duration_ms'),
            'album_name': track.get('album', {}).get('name'),
            'release_date': track.get('album', {}).get('release_date'),
        }
            
        return Response(song_data)
        
    except requests.RequestException as e:
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
