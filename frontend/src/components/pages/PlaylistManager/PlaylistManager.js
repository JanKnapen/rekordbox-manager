import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../layout';
import { LoadingSpinner, Snackbar } from '../../common';
import { SongMetadata } from '../../shared';
import { fetchSongs, getPlaylists, createPlaylist, addSongToPlaylist } from '../../../api/api';
import './PlaylistManager.css';

function PlaylistManager() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggingSong, setDraggingSong] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all saved songs (exclude songs already in playlists)
      const songsData = await fetchSongs(0, 1000, true); // Pass excludeInPlaylist=true
      const savedSongs = songsData.songs.filter(song => song.is_saved);
      setSongs(savedSongs);
      
      // Fetch all playlists
      const playlistsData = await getPlaylists();
      setPlaylists(playlistsData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    try {
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      setPlaylists([...playlists, newPlaylist]);
      setNewPlaylistName('');
      setShowCreateForm(false);
      setSnackbar({ message: `Playlist "${newPlaylist.name}" created`, type: 'success' });
    } catch (err) {
      setSnackbar({ message: 'Failed to create playlist: ' + (err.error || err.message), type: 'error' });
    }
  };

  const handleDragStart = (e, song) => {
    setDraggingSong(song);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggingSong(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e, playlist) => {
    e.preventDefault();
    if (!draggingSong) return;

    try {
      await addSongToPlaylist(playlist.id, draggingSong.spotify_id);
      // Remove song from the list (it's now in a playlist)
      setSongs(songs.filter(s => s.spotify_id !== draggingSong.spotify_id));
      // Update song count
      setPlaylists(playlists.map(p => 
        p.id === playlist.id 
          ? { ...p, song_count: p.song_count + 1 }
          : p
      ));
      setSnackbar({ message: `Added "${draggingSong.title}" to "${playlist.name}"`, type: 'success' });
    } catch (err) {
      setSnackbar({ message: 'Failed to add song: ' + (err.error || err.message), type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="playlist-manager">
      <Header showHome={true} />
      <div className="content">
        <h1>Playlist Manager</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="manager-layout">
          {/* Saved Songs Section */}
          <div className="songs-section">
            <div className="songs-header">
              <h2>Saved Songs ({songs.length})</h2>
            </div>
            <div className="songs-list">
              {songs.map(song => (
                <div
                  key={song.spotify_id}
                  className="song-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, song)}
                  onDragEnd={handleDragEnd}
                  onClick={() => navigate(`/saved_song/${song.spotify_id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {song.icon && <img src={song.icon} alt={song.title} />}
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artist}</div>
                    <SongMetadata bpm={song.bpm} musicKey={song.key} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Playlists Section */}
          <div className="playlists-section">
            <div className="playlists-header">
              <h2>Playlists ({playlists.length})</h2>
              <button 
                className="create-btn"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? 'Cancel' : '+ Create Playlist'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreatePlaylist} className="create-form">
                <input
                  type="text"
                  placeholder="Playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                />
                <button type="submit">Create</button>
              </form>
            )}

            <div className="playlists-list">
              {playlists.map(playlist => (
                <div
                  key={playlist.id}
                  className="playlist-item"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, playlist)}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="playlist-name">{playlist.name}</div>
                  <div className="playlist-count">{playlist.song_count} songs</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
    </div>
  );
}

export default PlaylistManager;
