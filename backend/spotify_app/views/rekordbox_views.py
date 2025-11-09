from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import xml.etree.ElementTree as ET
import sqlite3
import os
from spotify_app.models import Playlist, PlaylistSong, SpotifySong


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_rekordbox(request):
    """
    Sync playlists to Rekordbox database
    Accepts a database path and syncs all playlists
    """
    db_path = request.data.get('database_path')
    
    if not db_path:
        return Response({'error': 'Database path is required'}, status=400)
    
    # Check if it's XML or SQLite
    if db_path.endswith('.xml'):
        return sync_rekordbox_xml(db_path)
    elif db_path.endswith('.db') or 'master.db' in db_path:
        return sync_rekordbox_sqlite(db_path)
    else:
        return Response({'error': 'Unsupported file format. Please provide rekordbox.xml or master.db'}, status=400)


def sync_rekordbox_xml(xml_path):
    """
    Sync playlists to Rekordbox XML format
    This adds new playlists and tracks to the XML file
    """
    try:
        if not os.path.exists(xml_path):
            return Response({'error': f'File not found: {xml_path}'}, status=404)
        
        # Parse existing XML
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # Find COLLECTION and PLAYLISTS nodes
        collection = root.find('.//COLLECTION')
        playlists_node = root.find('.//PLAYLISTS')
        
        if collection is None or playlists_node is None:
            return Response({'error': 'Invalid Rekordbox XML format'}, status=400)
        
        # Get existing track IDs and playlist names
        existing_tracks = {}
        for track in collection.findall('TRACK'):
            location = track.get('Location')
            if location:
                existing_tracks[location] = track.get('TrackID')
        
        existing_playlist_names = set()
        for playlist in playlists_node.findall('.//NODE[@Type="1"]'):
            name = playlist.get('Name')
            if name:
                existing_playlist_names.add(name)
        
        # Get all playlists from our database
        playlists = Playlist.objects.all()
        
        added_playlists = 0
        added_tracks = 0
        next_track_id = max([int(tid) for tid in existing_tracks.values()] + [0]) + 1
        
        # Create a folder node for our playlists if it doesn't exist
        app_folder = None
        for node in playlists_node.findall('.//NODE[@Type="0"]'):
            if node.get('Name') == 'Rekordbox Manager':
                app_folder = node
                break
        
        if app_folder is None:
            app_folder = ET.SubElement(playlists_node, 'NODE', {
                'Type': '0',
                'Name': 'Rekordbox Manager',
                'Count': '0'
            })
        
        # Add each playlist
        for playlist in playlists:
            if playlist.name not in existing_playlist_names:
                # Create playlist node
                playlist_node = ET.SubElement(app_folder, 'NODE', {
                    'Type': '1',
                    'Name': playlist.name,
                    'KeyType': '0',
                    'Entries': str(PlaylistSong.objects.filter(playlist=playlist).count())
                })
                
                # Add tracks to playlist
                playlist_songs = PlaylistSong.objects.filter(playlist=playlist).select_related('spotify_song', 'spotify_song__soundcloud_match')
                
                for ps in playlist_songs:
                    song = ps.spotify_song
                    
                    # Check if song has a downloaded SoundCloud match
                    try:
                        sc_song = song.soundcloud_match
                        if sc_song.download_status == 'completed' and sc_song.file_path:
                            file_path = sc_song.file_path
                            
                            # Add track to collection if not exists
                            if file_path not in existing_tracks:
                                track_elem = ET.SubElement(collection, 'TRACK', {
                                    'TrackID': str(next_track_id),
                                    'Name': song.title,
                                    'Artist': song.artist,
                                    'Location': f'file://localhost{file_path}',
                                })
                                
                                # Add BPM and Key if available
                                if sc_song.bpm:
                                    track_elem.set('AverageBpm', str(sc_song.bpm))
                                
                                existing_tracks[file_path] = str(next_track_id)
                                added_tracks += 1
                                track_id = next_track_id
                                next_track_id += 1
                            else:
                                track_id = int(existing_tracks[file_path])
                            
                            # Add track to playlist
                            ET.SubElement(playlist_node, 'TRACK', {
                                'Key': str(track_id)
                            })
                    except:
                        # Song not downloaded, skip it
                        continue
                
                added_playlists += 1
        
        # Save XML back to file
        tree.write(xml_path, encoding='utf-8', xml_declaration=True)
        
        return Response({
            'success': True,
            'message': f'Successfully synced {added_playlists} playlists and {added_tracks} tracks to Rekordbox',
            'added_playlists': added_playlists,
            'added_tracks': added_tracks
        })
        
    except ET.ParseError as e:
        return Response({'error': f'Failed to parse XML: {str(e)}'}, status=400)
    except Exception as e:
        return Response({'error': f'Sync failed: {str(e)}'}, status=500)


def sync_rekordbox_sqlite(db_path):
    """
    Sync playlists to Rekordbox SQLite database
    Note: This is more complex and requires understanding Rekordbox's schema
    For now, return a message directing users to use XML export
    """
    return Response({
        'error': 'SQLite sync not yet implemented. Please export your Rekordbox library as XML (File > Export Collection in XML format) and use that file instead.'
    }, status=501)
