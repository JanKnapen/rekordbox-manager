"""
Utility functions for Spotify and SoundCloud operations
"""
import requests
import os
import re
import time
import threading
import yt_dlp
from ..models import SoundCloudSong


def analyze_audio(file_path, soundcloud_song_id):
    """Analyze audio file to extract BPM and key using Essentia"""
    try:
        import essentia.standard as es
        
        soundcloud_song = SoundCloudSong.objects.get(id=soundcloud_song_id)
        soundcloud_song.download_status = 'analyzing'
        soundcloud_song.download_progress = 90
        soundcloud_song.save()
        
        print(f"Analyzing audio: {file_path}")
        
        # Load audio file
        loader = es.MonoLoader(filename=file_path)
        audio = loader()
        
        # BPM Detection
        soundcloud_song.download_progress = 92
        soundcloud_song.save(update_fields=['download_progress'])
        
        rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
        bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)
        
        # Key Detection
        soundcloud_song.download_progress = 95
        soundcloud_song.save(update_fields=['download_progress'])
        
        key_extractor = es.KeyExtractor()
        key, scale, strength = key_extractor(audio)
        
        # Convert to Camelot key notation
        # Map includes both spellings (e.g., "Bb" and "B-flat")
        camelot_map = {
            # Major keys (outer wheel)
            ('C', 'major'): '8B',
            ('Db', 'major'): '3B',
            ('D-flat', 'major'): '3B',
            ('D', 'major'): '10B',
            ('Eb', 'major'): '5B',
            ('E-flat', 'major'): '5B',
            ('E', 'major'): '12B',
            ('F', 'major'): '7B',
            ('F#', 'major'): '2B',
            ('Gb', 'major'): '2B',
            ('G', 'major'): '9B',
            ('Ab', 'major'): '4B',
            ('A-flat', 'major'): '4B',
            ('A', 'major'): '11B',
            ('Bb', 'major'): '6B',
            ('B-flat', 'major'): '6B',
            ('B', 'major'): '1B',
            # Minor keys (inner wheel)
            ('C', 'minor'): '5A',
            ('Db', 'minor'): '12A',
            ('D-flat', 'minor'): '12A',
            ('D', 'minor'): '7A',
            ('Eb', 'minor'): '2A',
            ('E-flat', 'minor'): '2A',
            ('E', 'minor'): '9A',
            ('F', 'minor'): '4A',
            ('F#', 'minor'): '11A',
            ('Gb', 'minor'): '11A',
            ('G', 'minor'): '6A',
            ('Ab', 'minor'): '1A',
            ('A-flat', 'minor'): '1A',
            ('A', 'minor'): '8A',
            ('Bb', 'minor'): '3A',
            ('B-flat', 'minor'): '3A',
            ('B', 'minor'): '10A',
        }
        
        # Get Camelot notation
        formatted_key = camelot_map.get((key, scale), f"{key} {scale}")
        
        # Update database with results
        soundcloud_song.bpm = round(bpm)  # Round to whole number
        soundcloud_song.key = formatted_key
        soundcloud_song.download_status = 'completed'
        soundcloud_song.download_progress = 100
        soundcloud_song.save()
        
        print(f"Analysis complete - BPM: {round(bpm)}, Key: {formatted_key}")
        
    except Exception as e:
        print(f"Error analyzing audio: {e}")
        try:
            soundcloud_song = SoundCloudSong.objects.get(id=soundcloud_song_id)
            soundcloud_song.download_status = 'completed'  # Still mark as completed even if analysis fails
            soundcloud_song.download_progress = 100
            soundcloud_song.save()
        except:
            pass


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
                    # Calculate percentage (0-80% for download)
                    downloaded = d.get('downloaded_bytes', 0)
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    
                    if total > 0:
                        # Scale download progress to 0-80%
                        progress = int((downloaded / total) * 80)
                        # Update database
                        soundcloud_song.download_progress = progress
                        soundcloud_song.save(update_fields=['download_progress'])
                except Exception as e:
                    print(f"Error updating progress: {e}")
            elif d['status'] == 'finished':
                # Download finished, conversion starting (80%)
                soundcloud_song.download_progress = 80
                soundcloud_song.save(update_fields=['download_progress'])
        
        # Post-processing hook to track conversion
        def postprocessor_hook(d):
            if d['status'] == 'started':
                soundcloud_song.download_progress = 80
                soundcloud_song.save(update_fields=['download_progress'])
            elif d['status'] == 'processing':
                soundcloud_song.download_progress = 85
                soundcloud_song.save(update_fields=['download_progress'])
            elif d['status'] == 'finished':
                soundcloud_song.download_progress = 90
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
        download_file = os.path.join(download_path, f'{artist} - {title}.mp3')
        try:
            if os.path.exists(download_file):
                os.chmod(download_file, 0o666)
        except Exception as e:
            print(f"Warning: Could not change permissions: {e}")
        
        # Analyze audio file for BPM and key
        if os.path.exists(download_file):
            analyze_audio(download_file, soundcloud_song_id)
        else:
            # If file doesn't exist, just mark as completed
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
    """Get Spotify API access token using client credentials"""
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
