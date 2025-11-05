from django.shortcuts import render
from django.http import JsonResponse
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def get_spotify_songs(request):
    if request.method == 'GET':
        playlist_id = os.getenv('SPOTIFY_PLAYLIST_ID')
        print(playlist_id)
        access_token = get_spotify_access_token()
        
        if access_token:
            url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
            headers = {
                'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(url, headers=headers)
            songs = response.json().get('items', [])
            song_titles = [song['track']['name'] for song in songs]
            return JsonResponse({'songs': song_titles})
        else:
            return JsonResponse({'error': 'Unable to retrieve access token'}, status=400)

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