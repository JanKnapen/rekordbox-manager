import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSpotifySong, saveSoundCloudMatch } from '../api/api';
import LoadingSpinner from './LoadingSpinner';
import { FaCheck, FaExternalLinkAlt } from 'react-icons/fa';
import '../styles/NewSong.css';

const NewSong = () => {
    const [song, setSong] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [saving, setSaving] = useState(false);
    const { id } = useParams();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchSpotifySong(id);
            setSong(data);
        } catch (err) {
            setError(err?.detail || err?.message || JSON.stringify(err));
        } finally {
            setLoading(false);
        }
    }, [id]); // id as dependency since it's used in the function

    useEffect(() => {
        fetchData();
    }, [fetchData]); // Now fetchData is a dependency

    const handleSaveMatch = async (soundcloudMatch) => {
        if (saving) return;
        
        setSaving(true);
        try {
            await saveSoundCloudMatch(id, {
                title: song.title,
                artist: song.artist,
                icon: song.icon
            }, soundcloudMatch);
            
            // Redirect to home page
            navigate('/home');
        } catch (err) {
            setError(err?.detail || err?.message || 'Failed to save match');
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('rbm_authenticated');
        localStorage.removeItem('rbm_user');
        navigate('/login');
    };

    const handleHome = () => {
        navigate('/home');
    };

    return (
        <div className="page" onClick={() => setSelectedMatch(null)}>
            <header className="page-header">
                <div className="header-left">
                    <h1>RekordBox Manager</h1>
                </div>
                <div className="header-right">
                    <button onClick={handleHome} className="home-button">
                        Home
                    </button>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </header>
            {loading ? (
                <div className="page-loading">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="error-container">
                    <div className="error">{error}</div>
                </div>
            ) : song ? (
                <div className="content">
                    <div className="song-details">
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
                            <div className="info-item">
                                <label>Release Date</label>
                                <span>{new Date(song.release_date).toLocaleDateString()}</span>
                            </div>
                            <div className="info-item">
                                <label>Duration</label>
                                <span>{Math.floor(song.duration_ms / 60000)}:{String(Math.floor((song.duration_ms % 60000) / 1000)).padStart(2, '0')}</span>
                            </div>
                            {song.preview_url && (
                                <div className="info-item">
                                    <label>Preview</label>
                                    <audio controls src={song.preview_url} />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* SoundCloud Matches */}
                    <div className="soundcloud-matches">
                        <h2>SoundCloud Matches</h2>
                        <div className="songs-list">
                            {song.soundcloud_matches?.length > 0 ? (
                                song.soundcloud_matches.map((track) => (
                                    <div 
                                        key={track.id} 
                                        className={`song-item ${selectedMatch === track.id ? 'selected' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMatch(track.id);
                                        }}
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
                                        {selectedMatch === track.id && (
                                            <button 
                                                className="match-select-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveMatch(track);
                                                }}
                                                disabled={saving}
                                            >
                                                <FaCheck />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="no-songs">No matches found on SoundCloud</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="error-container">
                    <div className="error">Song not found</div>
                </div>
            )}
        </div>
    );
};

export default NewSong;