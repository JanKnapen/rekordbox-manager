import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSongs, fetchNewSpotifySongs, deleteSoundCloudMatch, checkSongInPlaylist } from '../../../api/api';
import { LoadingSpinner, Pagination, ConfirmDeleteButton } from '../../common';
import Header from '../../layout/Header';
import SongItem from '../../shared/SongItem';
import { FaSyncAlt, FaMinus } from 'react-icons/fa';
import './Home.css';

const Home = () => {
    const [savedSongs, setSavedSongs] = useState([]);
    const [newSongs, setNewSongs] = useState([]);
    const [savedLoading, setSavedLoading] = useState(true);
    const [newLoading, setNewLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null); // Track which song is awaiting confirmation
    const [checkingId, setCheckingId] = useState(null); // Track which song is being checked
    const [savedPage, setSavedPage] = useState(0); // Current page for saved songs
    const [totalSavedPages, setTotalSavedPages] = useState(0);
    const [initialLoad, setInitialLoad] = useState(true); // Track if this is the first load
    const SONGS_PER_PAGE = 15;
    const navigate = useNavigate();

    // Initial load - fetch both saved and new songs
    useEffect(() => {
        let mounted = true;
        setSavedLoading(true);
        setNewLoading(true);

        Promise.all([
            fetchSongs(savedPage, SONGS_PER_PAGE),
            fetchNewSpotifySongs()
        ])
            .then(([savedData, newOnes]) => {
                if (!mounted) return;
                setSavedSongs(savedData.songs || []);
                setTotalSavedPages(savedData.total_pages || 0);
                setNewSongs(newOnes);
                setInitialLoad(false);
            })
            .catch((err) => {
                if (mounted) {
                    setError(err?.detail || err?.message || JSON.stringify(err));
                }
            })
            .finally(() => {
                if (mounted) {
                    setSavedLoading(false);
                    setNewLoading(false);
                }
            });

        return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on initial mount

    // Pagination - only fetch saved songs when page changes
    useEffect(() => {
        if (initialLoad) return; // Skip on initial load
        
        let mounted = true;
        setSavedLoading(true);

        fetchSongs(savedPage, SONGS_PER_PAGE)
            .then((savedData) => {
                if (!mounted) return;
                setSavedSongs(savedData.songs || []);
                setTotalSavedPages(savedData.total_pages || 0);
            })
            .catch((err) => {
                if (mounted) {
                    setError(err?.detail || err?.message || JSON.stringify(err));
                }
            })
            .finally(() => mounted && setSavedLoading(false));

        return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedPage]);

    const handleDeleteMatch = async (e, spotifyId) => {
        e.stopPropagation();
        
        // First click: ask for confirmation
        if (confirmDelete !== spotifyId) {
            setConfirmDelete(spotifyId);
            return;
        }
        
        // Second click: actually delete
        try {
            await deleteSoundCloudMatch(spotifyId);
            // Refresh both lists
            const [savedData, newOnes] = await Promise.all([
                fetchSongs(savedPage, SONGS_PER_PAGE),
                fetchNewSpotifySongs()
            ]);
            setSavedSongs(savedData.songs || []);
            setTotalSavedPages(savedData.total_pages || 0);
            setNewSongs(newOnes);
            setConfirmDelete(null);
        } catch (err) {
            setError(err?.detail || err?.message || 'Failed to delete match');
            setConfirmDelete(null);
        }
    };

    const handleCheckSong = async (e, spotifyId) => {
        e.stopPropagation();
        
        setCheckingId(spotifyId);
        try {
            const result = await checkSongInPlaylist(spotifyId);
            
            if (result.deleted) {
                // Song was removed from database, refresh new songs list
                const newOnes = await fetchNewSpotifySongs();
                setNewSongs(newOnes);
            }
            // If song still exists, no action needed
        } catch (err) {
            setError(err?.detail || err?.message || 'Failed to check song');
        } finally {
            setCheckingId(null);
        }
    };

    const handleRefreshNewSongs = async () => {
        setRefreshing(true);
        try {
            const newOnes = await fetchNewSpotifySongs();
            setNewSongs(newOnes);
        } catch (err) {
            setError(err?.detail || err?.message || 'Failed to refresh new songs');
        } finally {
            setRefreshing(false);
        }
    };

    const handleBackgroundClick = () => {
        if (confirmDelete !== null) {
            setConfirmDelete(null);
        }
    };

    const handlePreviousPage = () => {
        if (savedPage > 0) {
            setSavedPage(savedPage - 1);
        }
    };

    const handleNextPage = () => {
        if (savedPage < totalSavedPages - 1) {
            setSavedPage(savedPage + 1);
        }
    };

    if (error) return <div className="error">{error}</div>;

    return (
        <div className="home" onClick={handleBackgroundClick}>
            <Header showHome={false} showPlaylistManager={true} />
            <div className="songs-container">
                <div className="lists-container">
                    <div className="list-section">
                        <div className="list-header">
                            <h2>Saved Songs</h2>
                            <Pagination
                                currentPage={savedPage}
                                totalPages={totalSavedPages}
                                onPrevious={handlePreviousPage}
                                onNext={handleNextPage}
                            />
                        </div>
                        <div className="songs-list">
                            {savedLoading ? (
                                <LoadingSpinner />
                            ) : savedSongs.length > 0 ? (
                                savedSongs.map((song) => (
                                    <SongItem
                                        key={song.spotify_id}
                                        song={song}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/saved_song/${song.spotify_id}`);
                                        }}
                                        actionButton={
                                            <ConfirmDeleteButton
                                                onDelete={(e) => handleDeleteMatch(e, song.spotify_id)}
                                                isConfirming={confirmDelete === song.spotify_id}
                                            />
                                        }
                                    >
                                        <div className="song-added">
                                            {song.saved_at ? new Date(song.saved_at).toLocaleDateString() : '-'}
                                        </div>
                                    </SongItem>
                                ))
                            ) : (
                                <div className="no-songs">No saved songs</div>
                            )}
                        </div>
                    </div>
                    
                    <div className="list-section">
                        <div className="list-header">
                            <h2>New Songs</h2>
                            <button 
                                className="refresh-button"
                                onClick={handleRefreshNewSongs}
                                disabled={refreshing}
                                title="Refresh new songs"
                            >
                                <FaSyncAlt className={refreshing ? 'spinning' : ''} />
                            </button>
                        </div>
                        <div className="songs-list">
                            {newLoading ? (
                                <LoadingSpinner />
                            ) : newSongs.length > 0 ? (
                                newSongs.map((song) => (
                                    <SongItem
                                        key={song.spotify_id}
                                        song={song}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/new_song/${song.spotify_id}`);
                                        }}
                                        actionButton={
                                            <button 
                                                className="check-song-button"
                                                onClick={(e) => handleCheckSong(e, song.spotify_id)}
                                                disabled={checkingId === song.spotify_id}
                                                title="Check if song still in playlist"
                                            >
                                                <FaMinus />
                                            </button>
                                        }
                                    >
                                        <div className="song-added">
                                            {song.added_at ? new Date(song.added_at).toLocaleDateString() : '-'}
                                        </div>
                                    </SongItem>
                                ))
                            ) : (
                                <div className="no-songs">No new songs</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;