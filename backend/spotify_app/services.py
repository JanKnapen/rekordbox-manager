from django.conf import settings
import requests

def get_spotify_playlist_songs():
    url = f"https://api.spotify.com/v1/playlists/{settings.SPOTIFY_PLAYLIST_ID}/tracks"
    headers = {
        "Authorization": f"Bearer {get_spotify_access_token()}"
    }
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        songs = response.json().get('items', [])
        return [song['track']['name'] for song in songs if song['track']]
    else:
        return []  # Handle error or return an empty list

def get_spotify_access_token():
    url = "https://accounts.spotify.com/api/token"
    payload = {
        'grant_type': 'client_credentials'
    }
    headers = {
        'Authorization': f"Basic {settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
    }
    
    response = requests.post(url, data=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        return None  # Handle error or return None