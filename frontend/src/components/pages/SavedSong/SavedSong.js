import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSpotifySong, fetchSoundCloudMatches, deleteSoundCloudMatch, getDownloadStatus, retryDownload } from '../../../api/api';
import LoadingSpinner from '../../common/LoadingSpinner';
import Header from '../../layout/Header';
import SongHeader from '../../shared/SongHeader';
import SongInfoGrid from '../../shared/SongInfoGrid';
import DownloadStatus from '../../shared/DownloadStatus';
import { FaTimes, FaExternalLinkAlt, FaExclamationTriangle } from 'react-icons/fa';
import '../NewSong/NewSong.css';

const SavedSong = () => {
    const [song, setSong] = useState(null);
    const [soundcloudMatches, setSoundcloudMatches] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [songData, matchesData, statusData] = await Promise.all([
                    fetchSpotifySong(id),
                    fetchSoundCloudMatches(id),
                    getDownloadStatus(id)
                ]);
                
                setSong(songData);
                setSoundcloudMatches(matchesData.soundcloud_matches);
                
                // Set download status
                if (statusData.has_match) {
                    setDownloadStatus(statusData.download_status);
                    setDownloadProgress(statusData.download_progress);
                }
            } catch (err) {
                setError(err?.detail || err?.message || JSON.stringify(err));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Poll for download status updates
    useEffect(() => {
        if (!downloadStatus || downloadStatus === 'completed' || downloadStatus === 'failed') {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const statusData = await getDownloadStatus(id);
                if (statusData.has_match) {
                    setDownloadStatus(statusData.download_status);
                    setDownloadProgress(statusData.download_progress);
                    
                    // Stop polling when download is complete or failed
                    if (statusData.download_status === 'completed' || statusData.download_status === 'failed') {
                        clearInterval(interval);
                    }
                }
            } catch (err) {
                console.error('Error fetching download status:', err);
            }
        }, 1000); // Poll every second

        return () => clearInterval(interval);
    }, [id, downloadStatus]);

    const handleRetryDownload = async () => {
        try {
            await retryDownload(id);
            setDownloadStatus('pending');
            setDownloadProgress(0);
        } catch (err) {
            setError('Failed to retry download');
        }
    };

    const handleDeleteMatch = async () => {
        // First click: ask for confirmation
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }

        // Second click: actually delete
        if (deleting) return;

        setDeleting(true);
        try {
            await deleteSoundCloudMatch(id);
            navigate('/home');
        } catch (err) {
            setError(err?.detail || err?.message || 'Failed to delete match');
            setConfirmDelete(false);
            setDeleting(false);
        }
    };

    const handleBackgroundClick = () => {
        if (confirmDelete) {
            setConfirmDelete(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <Header showHome={true} />
                <div className="page-loading">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page">
                <Header showHome={true} />
                <div className="error-container">
                    <div className="error">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page" onClick={handleBackgroundClick}>
            <Header showHome={true} />

            <div className="content">
                {song && (
                    <div className="song-details">
                        <h2 style={{ marginBottom: '2rem' }}>Spotify Track</h2>
                        <SongHeader song={song} />
                        <SongInfoGrid song={song} />

                        {soundcloudMatches && soundcloudMatches.length > 0 && (
                            <div className="soundcloud-matches" style={{ marginTop: '3rem' }}>
                                <h2>SoundCloud Match</h2>
                                <div className="songs-list">
                                    {soundcloudMatches.slice(0, 1).map((track) => (
                                        <div 
                                            key={track.id} 
                                            className="song-item"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button 
                                                className="soundcloud-link-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(track.url, '_blank');
                                                }}
                                                title="Open in SoundCloud"
                                            >
                                                <FaExternalLinkAlt />
                                            </button>
                                            <div className="song-icon">
                                                {track.icon ? (
                                                    <img src={track.icon} alt={track.title} />
                                                ) : (
                                                    <div className="placeholder-icon">♪</div>
                                                )}
                                            </div>
                                            <div className="song-info">
                                                <div className="song-title">{track.title}</div>
                                                <div className="song-artist">{track.artist}</div>
                                            </div>
                                            <div className="song-duration">
                                                {Math.floor(track.duration_ms / 60000)}:
                                                {String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <DownloadStatus
                                    status={downloadStatus}
                                    progress={downloadProgress}
                                    onRetry={handleRetryDownload}
                                />
                            </div>
                        )}

                        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
                            <button 
                                className={`delete-saved-button ${confirmDelete ? 'confirm' : ''}`}
                                onClick={handleDeleteMatch}
                                disabled={deleting}
                                title={confirmDelete ? "Click again to confirm deletion" : "Remove this saved song"}
                            >
                                {confirmDelete ? (
                                    <>
                                        <FaExclamationTriangle style={{ marginRight: '0.5rem' }} />
                                        Click Again to Confirm
                                    </>
                                ) : (
                                    <>
                                        <FaTimes style={{ marginRight: '0.5rem' }} />
                                        Remove Saved Song
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedSong;
