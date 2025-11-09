import axios from 'axios';

// Use relative URLs so the CRA dev-server proxy (package.json "proxy") forwards requests to backend.
// This keeps requests same-origin from the browser perspective and avoids cross-site cookie issues.
const api = axios.create({
  baseURL: '',               // relative paths -> proxy to backend in dev
  withCredentials: true,     // allow cookies (session & csrftoken) to be sent
});

// helper to read cookie (Django's default CSRF cookie name is 'csrftoken')
function getCookie(name) {
  const value = `; ${document.cookie || ''}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// attach CSRF header for non-safe methods
api.interceptors.request.use((config) => {
  const method = (config.method || '').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
      config.headers['X-CSRFToken'] = csrftoken;
    }
  }
  return config;
}, (err) => Promise.reject(err));

// handle 401/403 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear auth state
      localStorage.removeItem('rbm_authenticated');
      localStorage.removeItem('rbm_user');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// call this once before making POST/PUT/DELETE requests to ensure the csrftoken cookie is set
export const initCsrf = async () => {
  await api.get('/api/accounts/csrf/');
};

export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/api/accounts/login/', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const fetchSongs = async (page = 0, pageSize = 15, excludeInPlaylist = false) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (excludeInPlaylist) {
      params.append('exclude_in_playlist', 'true');
    }
    const response = await api.get(`/api/spotify/songs/?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const fetchNewSpotifySongs = async () => {
    try {
        const response = await api.get('/api/spotify/new-songs/');
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const fetchSpotifySong = async (spotifyId) => {
    try {
        const response = await api.get(`/api/spotify/song/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const fetchSoundCloudMatches = async (spotifyId) => {
    try {
        const response = await api.get(`/api/spotify/soundcloud-matches/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const saveSoundCloudMatch = async (spotifyId, spotifyData, soundcloudMatch) => {
    try {
        const response = await api.post('/api/spotify/save-match/', {
            spotify_id: spotifyId,
            spotify_title: spotifyData.title,
            spotify_artist: spotifyData.artist,
            spotify_icon: spotifyData.icon,
            soundcloud_match: soundcloudMatch
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const deleteSoundCloudMatch = async (spotifyId) => {
    try {
        const response = await api.delete(`/api/spotify/delete-match/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const checkSongInPlaylist = async (spotifyId) => {
    try {
        const response = await api.post(`/api/spotify/check-song/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getDownloadStatus = async (spotifyId) => {
    try {
        const response = await api.get(`/api/spotify/download-status/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const retryDownload = async (spotifyId) => {
    try {
        const response = await api.post(`/api/spotify/retry-download/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getPlaylists = async () => {
    try {
        const response = await api.get('/api/spotify/playlists/');
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const createPlaylist = async (name) => {
    try {
        const response = await api.post('/api/spotify/playlists/create/', { name });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getPlaylistSongs = async (playlistId) => {
    try {
        const response = await api.get(`/api/spotify/playlists/${playlistId}/songs/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const addSongToPlaylist = async (playlistId, spotifyId) => {
    try {
        const response = await api.post(`/api/spotify/playlists/${playlistId}/add-song/`, { spotify_id: spotifyId });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const removeSongFromPlaylist = async (playlistId, spotifyId) => {
    try {
        const response = await api.delete(`/api/spotify/playlists/${playlistId}/remove-song/${spotifyId}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export default api;