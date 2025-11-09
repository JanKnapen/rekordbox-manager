"""
Playlist management views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import SpotifySong, SoundCloudSong, Playlist, PlaylistSong
import os
import shutil


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_playlists(request):
    """Get all playlists"""
    playlists = Playlist.objects.all()
    return Response([{
        'id': p.id,
        'name': p.name,
        'song_count': p.songs.count(),
        'created_at': p.created_at
    } for p in playlists])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_playlist(request):
    """Create a new playlist and directory"""
    name = request.data.get('name')
    if not name:
        return Response({'error': 'Playlist name is required'}, status=400)
    
    try:
        # Create playlist in database
        playlist = Playlist.objects.create(name=name)
        
        # Create directory in downloads folder
        download_path = os.getenv('DOWNLOAD_PATH', '/downloads')
        playlist_dir = os.path.join(download_path, name)
        os.makedirs(playlist_dir, exist_ok=True)
        os.chmod(playlist_dir, 0o777)  # Make it accessible
        
        return Response({
            'id': playlist.id,
            'name': playlist.name,
            'song_count': 0,
            'created_at': playlist.created_at
        }, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_song_to_playlist(request, playlist_id):
    """Add a song to a playlist"""
    spotify_id = request.data.get('spotify_id')
    if not spotify_id:
        return Response({'error': 'Spotify ID is required'}, status=400)
    
    try:
        playlist = Playlist.objects.get(id=playlist_id)
        spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        
        # Check if song is already in any playlist
        if spotify_song.in_playlist:
            return Response({'error': 'Song is already in another playlist'}, status=400)
        
        # Get the highest position in the playlist
        max_position = PlaylistSong.objects.filter(playlist=playlist).count()
        
        # Add song to playlist
        playlist_song, created = PlaylistSong.objects.get_or_create(
            playlist=playlist,
            spotify_song=spotify_song,
            defaults={'position': max_position}
        )
        
        if not created:
            return Response({'error': 'Song already in playlist'}, status=400)
        
        # Mark song as in_playlist
        spotify_song.in_playlist = True
        spotify_song.save()
        
        # Copy mp3 file to playlist directory if it exists
        try:
            soundcloud_song = SoundCloudSong.objects.get(spotify_song=spotify_song)
            if soundcloud_song.download_status == 'completed':
                download_path = os.getenv('DOWNLOAD_PATH', '/downloads')
                source_file = os.path.join(download_path, f'{soundcloud_song.artist} - {soundcloud_song.title}.mp3')
                playlist_dir = os.path.join(download_path, playlist.name)
                dest_file = os.path.join(playlist_dir, f'{soundcloud_song.artist} - {soundcloud_song.title}.mp3')
                
                if os.path.exists(source_file):
                    os.makedirs(playlist_dir, exist_ok=True)
                    shutil.copy2(source_file, dest_file)
                    os.chmod(dest_file, 0o666)
                    print(f"Copied file to playlist: {dest_file}")
        except SoundCloudSong.DoesNotExist:
            pass  # Song doesn't have a SoundCloud match yet
        except Exception as e:
            print(f"Warning: Could not copy file to playlist: {e}")
        
        return Response({'success': True}, status=201)
    except Playlist.DoesNotExist:
        return Response({'error': 'Playlist not found'}, status=404)
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Song not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_playlist_songs(request, playlist_id):
    """Get all songs in a playlist"""
    try:
        playlist = Playlist.objects.get(id=playlist_id)
        playlist_songs = PlaylistSong.objects.filter(playlist=playlist).select_related('spotify_song')
        
        songs = []
        for ps in playlist_songs:
            song = ps.spotify_song
            song_data = {
                'id': song.id,
                'spotify_id': song.spotify_id,
                'title': song.title,
                'artist': song.artist,
                'icon': song.icon,
                'position': ps.position
            }
            
            # Try to get BPM and key from related SoundCloudSong
            try:
                soundcloud_song = song.soundcloud_match
                song_data['bpm'] = soundcloud_song.bpm
                song_data['key'] = soundcloud_song.key
            except:
                song_data['bpm'] = None
                song_data['key'] = None
            
            songs.append(song_data)
        
        return Response(songs)
    except Playlist.DoesNotExist:
        return Response({'error': 'Playlist not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_song_from_playlist(request, playlist_id, spotify_id):
    """Remove a song from a playlist"""
    try:
        playlist = Playlist.objects.get(id=playlist_id)
        spotify_song = SpotifySong.objects.get(spotify_id=spotify_id)
        
        # Find and delete the PlaylistSong entry
        playlist_song = PlaylistSong.objects.filter(
            playlist=playlist,
            spotify_song=spotify_song
        ).first()
        
        if not playlist_song:
            return Response({'error': 'Song not in this playlist'}, status=404)
        
        # Delete the PlaylistSong entry
        playlist_song.delete()
        
        # Mark song as not in any playlist
        spotify_song.in_playlist = False
        spotify_song.save()
        
        # Delete mp3 file from playlist directory if it exists
        try:
            soundcloud_song = SoundCloudSong.objects.get(spotify_song=spotify_song)
            download_path = os.getenv('DOWNLOAD_PATH', '/downloads')
            playlist_dir = os.path.join(download_path, playlist.name)
            playlist_file = os.path.join(playlist_dir, f'{soundcloud_song.artist} - {soundcloud_song.title}.mp3')
            
            if os.path.exists(playlist_file):
                os.remove(playlist_file)
                print(f"Removed file from playlist: {playlist_file}")
        except SoundCloudSong.DoesNotExist:
            pass  # Song doesn't have a SoundCloud match
        except Exception as e:
            print(f"Warning: Could not remove file from playlist: {e}")
        
        # Reorder remaining songs in the playlist
        remaining_songs = PlaylistSong.objects.filter(playlist=playlist).order_by('position')
        for index, ps in enumerate(remaining_songs):
            if ps.position != index:
                ps.position = index
                ps.save()
        
        return Response({'success': True}, status=200)
    except Playlist.DoesNotExist:
        return Response({'error': 'Playlist not found'}, status=404)
    except SpotifySong.DoesNotExist:
        return Response({'error': 'Song not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
