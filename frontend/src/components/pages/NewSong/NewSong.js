import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSpotifySong, fetchSoundCloudMatches, saveSoundCloudMatch } from '../../../api/api';
import LoadingSpinner from '../../common/LoadingSpinner';
import { HeaderDesktop as Header } from '../../layout';
import SongHeader from '../../shared/SongHeader';
import SongInfoGrid from '../../shared/SongInfoGrid';
import SoundCloudMatchItem from '../../shared/SoundCloudMatchItem';
import { FaRedo, FaExclamationTriangle } from 'react-icons/fa';
import { SongDetails } from '../../shared';
import '../../shared/SongDetails.css';

const NewSong = () => {
    const [song, setSong] = useState(null);
    const [songLoading, setSongLoading] = useState(true);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [soundcloudMatches, setSoundcloudMatches] = useState(null);
    const [soundcloudError, setSoundcloudError] = useState(false);
    const [error, setError] = useState('');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [saving, setSaving] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const { id } = useParams();
    const navigate = useNavigate();

    const fetchSongData = useCallback(async () => {
        try {
            setSongLoading(true);
            setError('');
            const data = await fetchSpotifySong(id);
            setSong(data);
        } catch (err) {
            setError(err?.detail || err?.message || JSON.stringify(err));
        } finally {
            setSongLoading(false);
        }
    }, [id]);

    const fetchMatches = useCallback(async () => {
        try {
            setMatchesLoading(true);
            setSoundcloudError(false);
            const data = await fetchSoundCloudMatches(id);
            setSoundcloudMatches(data.soundcloud_matches);
            setSoundcloudError(data.soundcloud_error);
        } catch (err) {
            setSoundcloudError(true);
        } finally {
            setMatchesLoading(false);
            setRetrying(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSongData();
        fetchMatches();
    }, [fetchSongData, fetchMatches]);

    const handleRetry = () => {
        setRetrying(true);
        fetchMatches();
    };

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

    return (
        <div className="page" onClick={() => setSelectedMatch(null)}>
            <Header showHome={true} />
            {songLoading ? (
                <div className="page-loading">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="error-container">
                    <div className="error">{error}</div>
                </div>
            ) : song ? (
                <div className="content">
                    <SongDetails>
                        <SongHeader song={song} />
                        <SongInfoGrid song={song} />
                    </SongDetails>
                    
                    {/* SoundCloud Matches */}
                    <div className="soundcloud-matches">
                        <h2>SoundCloud Matches</h2>
                        <div className="songs-list">
                            {matchesLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <LoadingSpinner />
                                </div>
                            ) : soundcloudError ? (
                                <div className="retry-container">
                                    <FaExclamationTriangle style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }} />
                                    <div style={{ marginBottom: '1rem', color: '#64748b' }}>
                                        Failed to load SoundCloud matches
                                    </div>
                                    <button 
                                        className="retry-button"
                                        onClick={handleRetry}
                                        disabled={retrying}
                                    >
                                        <FaRedo style={{ marginRight: '0.5rem' }} />
                                        {retrying ? 'Retrying...' : 'Retry'}
                                    </button>
                                </div>
                            ) : soundcloudMatches?.length > 0 ? (
                                soundcloudMatches.map((track) => (
                                    <SoundCloudMatchItem
                                        key={track.id}
                                        track={track}
                                        isSelected={selectedMatch === track.id}
                                        onSelect={setSelectedMatch}
                                        onSave={handleSaveMatch}
                                        saving={saving}
                                    />
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