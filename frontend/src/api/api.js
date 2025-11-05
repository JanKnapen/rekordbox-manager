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

// call this once (GET) before making POST/PUT/DELETE requests to ensure the csrftoken cookie is set
export const initCsrf = async () => {
  // backend should expose /api/csrf/ which sets the csrftoken cookie (see backend change below)
  await api.get('/api/accounts/csrf/');
};

export const loginUser = async (credentials) => {
  try {
    const response = await api.post(`/api/accounts/login/`, credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const fetchSongs = async () => {
  try {
    const response = await api.get(`/api/spotify/songs/`);
    const data = response.data;

    // If backend returns { songs: [...] } or [...] handle both.
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.songs)) return data.songs;

    // Fallback: if the API returns an object map, try to extract values as array
    if (data && typeof data === 'object') return Object.values(data);

    return []; // default empty array
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default api;