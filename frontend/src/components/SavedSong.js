import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSpotifySong, deleteSoundCloudMatch, getDownloadStatus, retryDownload } from '../api/api';
import LoadingSpinner from './LoadingSpinner';
import { FaTimes, FaExternalLinkAlt, FaExclamationTriangle, FaRedo, FaCheck } from 'react-icons/fa';
import '../styles/NewSong.css';

const SavedSong = () => {
    const [song, setSong] = useState(null);
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
                const data = await fetchSpotifySong(id);
                setSong(data);
                
                // Fetch download status
                const statusData = await getDownloadStatus(id);
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

    const handleLogout = () => {
        localStorage.removeItem('rbm_authenticated');
        localStorage.removeItem('rbm_user');
        navigate('/login');
    };

    const handleDelete = async () => {
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
                <header className="page-header">
                    <div className="header-left">
                        <h1>Song Details</h1>
                    </div>
                    <div className="header-right">
                        <button onClick={() => navigate('/home')} className="home-button">
                            Home
                        </button>
                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </div>
                </header>
                <div className="page-loading">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page">
                <header className="page-header">
                    <div className="header-left">
                        <h1>Song Details</h1>
                    </div>
                    <div className="header-right">
                        <button onClick={() => navigate('/home')} className="home-button">
                            Home
                        </button>
                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </div>
                </header>
                <div className="error-container">
                    <div className="error">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page" onClick={handleBackgroundClick}>
            <header className="page-header">
                <div className="header-left">
                    <h1>Saved Song Details</h1>
                </div>
                <div className="header-right">
                    <button onClick={() => navigate('/home')} className="home-button">
                        Home
                    </button>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </header>

            <div className="content">
                {song && (
                    <div className="song-details">
                        <h2 style={{ marginBottom: '2rem' }}>Spotify Track</h2>
                        <div className="song-header">
                            <div className="song-icon-large">
                                {song.icon ? (
                                    <img src={song.icon} alt={song.title} />
                                ) : (
                                    <div className="placeholder-icon-large">♪</div>
                                )}
                            </div>
                            <div className="song-header-info">
                                <h2>{song.title}</h2>
                                <p className="artist">{song.artist}</p>
                                {song.album_name && <p className="album">{song.album_name}</p>}
                            </div>
                        </div>

                        <div className="song-info-grid">
                            {song.release_date && (
                                <div className="info-item">
                                    <label>Release Date</label>
                                    <span>{new Date(song.release_date).toLocaleDateString()}</span>
                                </div>
                            )}
                            {song.duration_ms && (
                                <div className="info-item">
                                    <label>Duration</label>
                                    <span>
                                        {Math.floor(song.duration_ms / 60000)}:
                                        {String(Math.floor((song.duration_ms % 60000) / 1000)).padStart(2, '0')}
                                    </span>
                                </div>
                            )}
                            {song.preview_url && (
                                <div className="info-item">
                                    <label>Preview</label>
                                    <audio controls src={song.preview_url} />
                                </div>
                            )}
                        </div>

                        {song.soundcloud_matches && song.soundcloud_matches.length > 0 && (
                            <div className="soundcloud-matches" style={{ marginTop: '3rem' }}>
                                <h2>SoundCloud Match</h2>
                                <div className="songs-list">
                                    {song.soundcloud_matches.slice(0, 1).map((track) => (
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

                                {/* Download Status Section */}
                                <div className="download-status-container">
                                    {downloadStatus === 'pending' && (
                                        <div className="download-status">
                                            <div className="status-text">Download queued...</div>
                                        </div>
                                    )}
                                    
                                    {downloadStatus === 'downloading' && (
                                        <div className="download-status">
                                            <div className="status-text">Downloading: {downloadProgress}%</div>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-bar-fill" 
                                                    style={{ width: `${downloadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {downloadStatus === 'completed' && (
                                        <div className="download-status success">
                                            <FaCheck className="status-icon" />
                                            <div className="status-text">Download succeeded</div>
                                        </div>
                                    )}
                                    
                                    {downloadStatus === 'failed' && (
                                        <div className="download-status failed">
                                            <FaExclamationTriangle className="status-icon" />
                                            <div className="status-text">Download failed</div>
                                            <button 
                                                className="retry-button"
                                                onClick={handleRetryDownload}
                                            >
                                                <FaRedo style={{ marginRight: '0.5rem' }} />
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                            <button 
                                className={`delete-saved-button ${confirmDelete ? 'confirm' : ''}`}
                                onClick={handleDelete}
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
