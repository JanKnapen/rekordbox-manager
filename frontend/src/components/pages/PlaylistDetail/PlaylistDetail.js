import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HeaderDesktop as Header } from '../../layout';
import { LoadingSpinner, Snackbar, ConfirmDeleteButton } from '../../common';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { SongMetadata, PlaylistDetails } from '../../shared';
import { openInNewTabOrNavigate } from '../../../utils/navHelper';
import { getPlaylistSongs, getPlaylists, removeSongFromPlaylist, deletePlaylist } from '../../../api/api';
import './PlaylistDetail.css';
import '../../shared/SongDetails.css';

function PlaylistDetail() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistMeta, setPlaylistMeta] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeletePlaylist, setConfirmDeletePlaylist] = useState(false);

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
        setPlaylistMeta(currentPlaylist);
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

  const handleDeletePlaylist = async (e) => {
    // prevent the document click handler from immediately clearing the confirm state
    e && e.stopPropagation && e.stopPropagation();

    // first click sets confirm state, second click performs delete
    if (!confirmDeletePlaylist) {
      setConfirmDeletePlaylist(true);
      setSnackbar({ message: 'Click delete again to confirm playlist deletion', type: 'warning' });
      // Also set a timeout as a fallback to clear the confirm state
      setTimeout(() => setConfirmDeletePlaylist(false), 4000); // reset after 4s
      return;
    }

    try {
      await deletePlaylist(playlistId);
      setSnackbar({ message: 'Playlist deleted', type: 'success' });
      // navigate back to playlist manager
      navigate('/playlist-manager');
    } catch (err) {
      setSnackbar({ message: 'Failed to delete playlist: ' + (err.error || err.message), type: 'error' });
      setConfirmDeletePlaylist(false);
    }
  };

  // Clear confirm state when clicking anywhere else on the page
  useEffect(() => {
    const onDocumentClick = () => {
      if (confirmDeletePlaylist) setConfirmDeletePlaylist(false);
    };

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [confirmDeletePlaylist]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="playlist-detail">
      <Header showHome={true} showPlaylistManager={true} />
      <div className="content">
        <PlaylistDetails
          title={playlistName}
          metaLine={(
            <>
              {songs.length} songs
              {playlistMeta && playlistMeta.created_at && (
                <> • {new Date(playlistMeta.created_at).toLocaleDateString()}</>
              )}
            </>
          )}
          icon={playlistMeta?.icon}
          actionButton={(
            <button
              className={`delete-saved-button ${confirmDeletePlaylist ? 'confirm' : ''}`}
              onClick={handleDeletePlaylist}
              title={confirmDeletePlaylist ? 'Click again to confirm deletion' : 'Delete Playlist'}
            >
              {confirmDeletePlaylist ? (
                <>
                  <FaExclamationTriangle style={{ marginRight: '0.5rem' }} />
                  Click Again to Confirm
                </>
              ) : (
                <>
                  <FaTimes style={{ marginRight: '0.5rem' }} />
                  Delete Playlist
                </>
              )}
            </button>
          )}
        />

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
                <div className="song-content" onClick={(e) => openInNewTabOrNavigate(e, navigate, `/saved_song/${song.spotify_id}`)} onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, `/saved_song/${song.spotify_id}`)}>
                  {song.icon && <img src={song.icon} alt={song.title} />}
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artist}</div>
                    <SongMetadata bpm={song.bpm} musicKey={song.key} />
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
