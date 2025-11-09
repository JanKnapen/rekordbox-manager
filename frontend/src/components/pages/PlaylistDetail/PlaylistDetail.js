import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../layout';
import { LoadingSpinner, Snackbar, ConfirmDeleteButton } from '../../common';
import { getPlaylistSongs, getPlaylists, removeSongFromPlaylist } from '../../../api/api';
import './PlaylistDetail.css';

function PlaylistDetail() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playlistName, setPlaylistName] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadPlaylistData();
  }, [playlistId]);

  const loadPlaylistData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all playlists to get the name
      const playlists = await getPlaylists();
      const currentPlaylist = playlists.find(p => p.id === parseInt(playlistId));
      if (currentPlaylist) {
        setPlaylistName(currentPlaylist.name);
      }
      
      // Fetch songs in this playlist
      const songsData = await getPlaylistSongs(playlistId);
      setSongs(songsData);
    } catch (err) {
      setError(err.message || 'Failed to load playlist songs');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSong = async (e, spotifyId) => {
    e.stopPropagation(); // Prevent navigation when clicking remove button
    
    // First click: ask for confirmation
    if (confirmDelete !== spotifyId) {
      setConfirmDelete(spotifyId);
      return;
    }
    
    // Second click: actually delete
    try {
      await removeSongFromPlaylist(playlistId, spotifyId);
      
      // Remove song from UI
      setSongs(songs.filter(song => song.spotify_id !== spotifyId));
      
      setSnackbar({
        message: 'Song removed from playlist',
        type: 'success'
      });
      setConfirmDelete(null);
    } catch (error) {
      setSnackbar({
        message: error.error || 'Failed to remove song',
        type: 'error'
      });
      setConfirmDelete(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="playlist-detail">
      <Header showHome={true} showPlaylistManager={true} />
      <div className="content">
        <div className="playlist-header">
          <h1>{playlistName}</h1>
          <p className="song-count">{songs.length} songs</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="songs-list">
          {songs.length === 0 ? (
            <div className="no-songs">No songs in this playlist</div>
          ) : (
            songs.map((song) => (
              <div
                key={song.spotify_id}
                className="song-item"
              >
                <div className="song-content" onClick={() => navigate(`/saved_song/${song.spotify_id}`)}>
                  {song.icon && <img src={song.icon} alt={song.title} />}
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artist}</div>
                  </div>
                </div>
                <ConfirmDeleteButton
                  onDelete={(e) => handleRemoveSong(e, song.spotify_id)}
                  isConfirming={confirmDelete === song.spotify_id}
                  title={confirmDelete === song.spotify_id ? "Click again to confirm" : "Remove from playlist"}
                />
              </div>
            ))
          )}
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

export default PlaylistDetail;
