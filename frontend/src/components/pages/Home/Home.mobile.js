import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderMobile from '../../layout/Header.mobile';
import SongItem from '../../shared/SongItem';
import { fetchSongs, fetchNewSpotifySongs, deleteSoundCloudMatch, checkSongInPlaylist } from '../../../api/api';
import { openInNewTabOrNavigate } from '../../../utils/navHelper';
import { ConfirmDeleteButton } from '../../common';
import { FaMinus } from 'react-icons/fa';
import { FaSyncAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Home.mobile.css';

// Minimal mobile home view using the mobile header. We'll implement
// the rest of the page layout later.
const STORAGE_KEY = 'home_mobile_selection'; // 'saved' or 'new'

const HomeMobile = () => {
  const navigate = useNavigate();
  const [selection, setSelection] = useState(() => {
    try {
      // default to 'new' on mobile per UX request
      return localStorage.getItem(STORAGE_KEY) || 'new';
    } catch (e) {
      return 'new';
    }
  });

  const [savedSongs, setSavedSongs] = useState([]);
  const [newSongs, setNewSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); // Track which song is awaiting confirmation
  const [checkingId, setCheckingId] = useState(null); // Track which song is being checked
  const [savedPage, setSavedPage] = useState(0);
  const [totalSavedPages, setTotalSavedPages] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const listRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetchSongs(savedPage, 15),
      fetchNewSpotifySongs(),
    ])
      .then(([savedData, newOnes]) => {
        if (!mounted) return;
        setSavedSongs(savedData.songs || []);
        setTotalSavedPages(savedData.total_pages || 0);
        setNewSongs(newOnes || []);
      })
      .catch((err) => {
        console.error('Failed to load songs', err);
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPage]);

  // Persist selection
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, selection); } catch (e) {}
  }, [selection]);

  const handleSelect = (which) => {
    setSelection(which);
    // reset saved page to first page whenever switching lists
    setSavedPage(0);
    // scroll list to top
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const handlePrev = () => {
    if (selection !== 'saved') return; // only paginated for saved songs
    setSavedPage((p) => Math.max(0, p - 1));
  };

  const handleNext = () => {
    if (selection !== 'saved') return;
    setSavedPage((p) => Math.min(totalSavedPages - 1, p + 1));
  };

  const handleSync = async () => {
    setRefreshing(true);
    try {
      if (selection === 'saved') {
        const savedData = await fetchSongs(savedPage, 15);
        setSavedSongs(savedData.songs || []);
        setTotalSavedPages(savedData.total_pages || 0);
      } else {
        const newOnes = await fetchNewSpotifySongs();
        setNewSongs(newOnes || []);
      }
    } catch (err) {
      console.error('Failed to refresh songs', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteMatch = async (e, spotifyId) => {
    e.stopPropagation();
    // First click: ask for confirmation
    if (confirmDelete !== spotifyId) {
      setConfirmDelete(spotifyId);
      return;
    }

    try {
      await deleteSoundCloudMatch(spotifyId);
      // Refresh saved and new lists
      const [savedData, newOnes] = await Promise.all([
        fetchSongs(savedPage, 15),
        fetchNewSpotifySongs(),
      ]);
      setSavedSongs(savedData.songs || []);
      setTotalSavedPages(savedData.total_pages || 0);
      setNewSongs(newOnes || []);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete match', err);
      setConfirmDelete(null);
    }
  };

  const handleCheckSong = async (e, spotifyId) => {
    e.stopPropagation();
    setCheckingId(spotifyId);
    try {
      const result = await checkSongInPlaylist(spotifyId);
      if (result.deleted) {
        const newOnes = await fetchNewSpotifySongs();
        setNewSongs(newOnes || []);
      }
    } catch (err) {
      console.error('Failed to check song', err);
    } finally {
      setCheckingId(null);
    }
  };

  const renderList = () => {
    const list = selection === 'saved' ? savedSongs : newSongs;
    if (loading) return <div className="mobile-loading">Loading…</div>;
    if (!list || list.length === 0) return <div className="mobile-empty">No songs</div>;

    return (
      <div className="mobile-list" ref={listRef}>
        {list.map((song) => (
          <SongItem
            key={song.spotify_id}
            song={song}
            onClick={(e) => openInNewTabOrNavigate(e, navigate, selection === 'saved' ? `/saved_song/${song.spotify_id}` : `/new_song/${song.spotify_id}`)}
            actionButton={
              selection === 'saved' ? (
                <ConfirmDeleteButton
                  onDelete={(e) => handleDeleteMatch(e, song.spotify_id)}
                  isConfirming={confirmDelete === song.spotify_id}
                />
              ) : (
                <button
                  className="check-song-button"
                  onClick={(e) => handleCheckSong(e, song.spotify_id)}
                  disabled={checkingId === song.spotify_id}
                  title="Check if song still in playlist"
                >
                  <FaMinus />
                </button>
              )
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="home mobile-view">
      <HeaderMobile showHome={false} showPlaylistManager={true} />
      <div className="mobile-controls">
        <div className="mobile-toggle">
          <button className={selection === 'saved' ? 'active' : ''} onClick={() => handleSelect('saved')}>Saved</button>
          <button className={selection === 'new' ? 'active' : ''} onClick={() => handleSelect('new')}>New</button>
        </div>

        <div className="mobile-actions">
          <div className="pagination-group">
            <button onClick={handlePrev} disabled={selection !== 'saved' || savedPage <= 0} title="Previous page"><FaChevronLeft /></button>
            <div className="page-indicator">{selection === 'saved' ? (savedPage + 1) : 1}/{selection === 'saved' ? Math.max(1, totalSavedPages) : 1}</div>
            <button onClick={handleNext} disabled={selection !== 'saved' || savedPage >= totalSavedPages - 1} title="Next page"><FaChevronRight /></button>
          </div>

          <div className="sync-group">
            <button className="sync-button" onClick={handleSync} title="Refresh songs">
              <FaSyncAlt className={refreshing ? 'spinning' : ''} />
            </button>
          </div>
        </div>
      </div>

      {renderList()}
    </div>
  );
};

export default HomeMobile;
