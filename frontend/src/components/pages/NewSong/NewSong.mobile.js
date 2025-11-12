import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './NewSong.mobile.css';
import HeaderMobile from '../../layout/Header.mobile';
import LoadingSpinner from '../../common/LoadingSpinner';
import { fetchSpotifySong } from '../../../api/api';
import { SongDetailsMobile } from '../../shared/SongDetails';
import { SongHeaderMobile } from '../../shared/SongHeader';
import { SongInfoGridMobile } from '../../shared/SongInfoGrid';

const NewSongMobile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchSongData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await fetchSpotifySong(id);
            setSong(data);
        } catch (err) {
            setError(err?.detail || err?.message || JSON.stringify(err));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSongData();
    }, [fetchSongData]);

    return (
        <div className="page mobile-new-song">
            <HeaderMobile showHome={true} showPlaylistManager={false} />

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
                    <SongDetailsMobile>
                        <SongHeaderMobile song={song} />
                        <SongInfoGridMobile song={song} />
                    </SongDetailsMobile>

                    <div className="soundcloud-matches">
                        <h2>SoundCloud Matches</h2>
                        <div className="songs-list">
                            <div style={{ padding: '1rem', color: '#64748b' }}>
                                SoundCloud matches are available in the desktop view. Mobile match tooling will be added later.
                            </div>
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

export default NewSongMobile;