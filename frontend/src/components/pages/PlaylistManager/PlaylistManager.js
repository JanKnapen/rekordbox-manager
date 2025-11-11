import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../layout';
import { LoadingSpinner, Snackbar, RekordboxSyncModal, ConfirmDeleteButton, Pagination } from '../../common';
import { SongMetadata } from '../../shared';
import { fetchSongs, getPlaylists, createPlaylist, addSongToPlaylist, deletePlaylist } from '../../../api/api';
import { openInNewTabOrNavigate } from '../../../utils/navHelper';
import './PlaylistManager.css';

function PlaylistManager() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [songsLoading, setSongsLoading] = useState(false);
  const [error, setError] = useState(null);
  const getInitialSavedPage = () => {
    try {
      const v = parseInt(localStorage.getItem('pm_savedPage') || '0', 10);
      return isNaN(v) ? 0 : v;
    } catch (e) {
      return 0;
    }
  };

  const [savedPage, setSavedPage] = useState(getInitialSavedPage);
  const [totalSavedPages, setTotalSavedPages] = useState(0);
  const SONGS_PER_PAGE = 15;
  const [draggingSong, setDraggingSong] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const getInitialShowOnly = () => {
    try {
      return localStorage.getItem('pm_showOnlyInPlaylist') === 'true';
    } catch (e) {
      return false;
    }
  };

  const [showOnlyInPlaylist, setShowOnlyInPlaylist] = useState(getInitialShowOnly);

  const mountedRef = useRef(false);

  // Initial load: playlists + songs (full-page spinner)
  useEffect(() => {
    const doInitial = async () => {
      await loadInitialData();
      mountedRef.current = true;
    };
    doInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the view toggle changes after initial mount, only reload the songs list
  useEffect(() => {
    if (!mountedRef.current) return;
    loadSongsOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlyInPlaylist]);

  // When saved page changes after initial mount, only reload songs
  useEffect(() => {
    if (!mountedRef.current) return;
    loadSongsOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPage]);

  // Persist view mode to localStorage so it survives reloads
  useEffect(() => {
    try {
      localStorage.setItem('pm_showOnlyInPlaylist', showOnlyInPlaylist ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }, [showOnlyInPlaylist]);

  // Persist current saved page to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pm_savedPage', String(savedPage));
    } catch (e) {
      // ignore
    }
  }, [savedPage]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      // Fetch saved songs (default: exclude songs already in playlists)
  // If showing only songs already in playlists, request server-side filter (in_playlist=true)
  // Otherwise request server-side exclusion of in-playlist songs (exclude_in_playlist=true)
  const songsData = await fetchSongs(savedPage, SONGS_PER_PAGE, !showOnlyInPlaylist, showOnlyInPlaylist ? true : null);
      let savedSongs = songsData.songs.filter(song => song.is_saved);
      if (showOnlyInPlaylist) {
        savedSongs = savedSongs.filter(song => !!song.in_playlist);
      }
      setSongs(savedSongs);
      setTotalSavedPages(songsData.total_pages || 0);

      // Fetch all playlists
      const playlistsData = await getPlaylists();
      setPlaylists(playlistsData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadSongsOnly = async () => {
    try {
      setSongsLoading(true);
  const songsData = await fetchSongs(savedPage, SONGS_PER_PAGE, !showOnlyInPlaylist, showOnlyInPlaylist ? true : null);
      let savedSongs = songsData.songs.filter(song => song.is_saved);
      if (showOnlyInPlaylist) {
        savedSongs = savedSongs.filter(song => !!song.in_playlist);
      }
      setSongs(savedSongs);
      setTotalSavedPages(songsData.total_pages || 0);
    } catch (err) {
      setSnackbar({ message: 'Failed to load songs: ' + (err.error || err.message), type: 'error' });
    } finally {
      setSongsLoading(false);
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

  const handleDeletePlaylist = async (e, playlistId) => {
    // prevent navigation when clicking the delete button
    e.stopPropagation && e.stopPropagation();

    // first click: set confirming
    if (confirmDelete !== playlistId) {
      setConfirmDelete(playlistId);
      return;
    }

    try {
      await deletePlaylist(playlistId);
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      setSnackbar({ message: 'Playlist deleted', type: 'success' });
    } catch (err) {
      setSnackbar({ message: 'Failed to delete playlist: ' + (err.error || err.message), type: 'error' });
    } finally {
      setConfirmDelete(null);
    }
  };

  // Clear confirming state when clicking anywhere else on the page
  useEffect(() => {
    const onDocumentClick = () => {
      if (confirmDelete !== null) setConfirmDelete(null);
    };

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [confirmDelete]);

  const handleDragStart = (e, song) => {
    // Check if song is fully downloaded and analyzed
    if (!song.download_status || song.download_status !== 'completed') {
      e.preventDefault();
      setSnackbar({ 
        message: `"${song.title}" is not ready yet. Please wait for download and analysis to complete.`, 
        type: 'error' 
      });
      return;
    }
    
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
      // reload current songs page to keep pagination consistent
      await loadSongsOnly();
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

  const handleSyncSuccess = (result) => {
    setShowSyncModal(false);
    setSnackbar({ 
      message: result.message || 'Successfully synced to Rekordbox!', 
      type: 'success' 
    });
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="playlist-manager">
      <Header 
        showHome={true} 
        showSync={true}
        onSyncClick={() => setShowSyncModal(true)}
      />
      <div className="content">
        <h1>Playlist Manager</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="manager-layout">
          {/* Saved Songs Section */}
          <div className="songs-section">
            <div className="songs-header">
                <h2>Saved Songs</h2>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                  <div className="view-toggle">
                    <button
                      className={`toggle-btn ${!showOnlyInPlaylist ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setShowOnlyInPlaylist(false); setSavedPage(0); }}
                    >
                      Not in playlists
                    </button>
                    <button
                      className={`toggle-btn ${showOnlyInPlaylist ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setShowOnlyInPlaylist(true); setSavedPage(0); }}
                    >
                      In playlists
                    </button>
                  </div>
                  <Pagination
                    currentPage={savedPage}
                    totalPages={totalSavedPages}
                    onPrevious={() => setSavedPage(Math.max(0, savedPage - 1))}
                    onNext={() => setSavedPage(Math.min(totalSavedPages - 1, savedPage + 1))}
                  />
                </div>
            </div>
            <div className="songs-list">
              {songsLoading ? (
                <div className="songs-loading">
                  <LoadingSpinner />
                </div>
              ) : (
                songs.map((song) => {
                  const isReady = song.download_status === 'completed';
                  return (
                    <div
                      key={song.spotify_id}
                      className={`song-item ${!isReady ? 'not-ready' : ''}`}
                      draggable={isReady}
                      onDragStart={(e) => handleDragStart(e, song)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => openInNewTabOrNavigate(e, navigate, `/saved_song/${song.spotify_id}`)}
                      onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, `/saved_song/${song.spotify_id}`)}
                      style={{ cursor: isReady ? 'grab' : 'pointer' }}
                      title={!isReady ? 'Song is still downloading/analyzing' : ''}
                    >
                      {song.icon && <img src={song.icon} alt={song.title} />}
                      <div className="song-info">
                        <div className="song-title">{song.title}</div>
                        <div className="song-artist">{song.artist}</div>
                        <SongMetadata bpm={song.bpm} musicKey={song.key} />
                        {!isReady && (
                          <div className="status-badge">
                            {song.download_status === 'downloading' && '⏳ Downloading...'}
                            {song.download_status === 'analyzing' && '🔍 Analyzing...'}
                            {(!song.download_status || song.download_status === 'pending') && '⏳ Pending...'}
                            {song.download_status === 'failed' && '❌ Failed'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Playlists Section */}
          <div className="playlists-section">
            <div className="playlists-header">
              <h2>Playlists</h2>
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
                  onClick={(e) => openInNewTabOrNavigate(e, navigate, `/playlist/${playlist.id}`)}
                  onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, `/playlist/${playlist.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="playlist-left">
                    <div className="playlist-name">{playlist.name}</div>
                    <div className="playlist-count">{playlist.song_count} songs</div>
                  </div>
                  <ConfirmDeleteButton
                    onDelete={(e) => handleDeletePlaylist(e, playlist.id)}
                    isConfirming={confirmDelete === playlist.id}
                    title={confirmDelete === playlist.id ? 'Click again to confirm delete' : 'Delete playlist'}
                    className="playlist-delete-btn"
                  />
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
      {showSyncModal && (
        <RekordboxSyncModal
          onClose={() => setShowSyncModal(false)}
          onSuccess={handleSyncSuccess}
        />
      )}
    </div>
  );
}

export default PlaylistManager;
