import React from 'react';

const SongInfoGridDesktop = ({ song, bpm, musicKey }) => {
    return (
        <div className="song-info-grid">
            <div className="info-item">
                <label>Release Date</label>
                <span>{new Date(song.release_date).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
                <label>Duration</label>
                <span>
                    {Math.floor(song.duration_ms / 60000)}:
                    {String(Math.floor((song.duration_ms % 60000) / 1000)).padStart(2, '0')}
                </span>
            </div>
            {bpm && (
                <div className="info-item">
                    <label>BPM</label>
                    <span>{Math.round(bpm)}</span>
                </div>
            )}
            {musicKey && (
                <div className="info-item">
                    <label>Key</label>
                    <span>{musicKey}</span>
                </div>
            )}
            {song.preview_url && (
                <div className="info-item full-width">
                    <label>Preview</label>
                    <audio controls src={song.preview_url} />
                </div>
            )}
        </div>
    );
};

export default SongInfoGridDesktop;
