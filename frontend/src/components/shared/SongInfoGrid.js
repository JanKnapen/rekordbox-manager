import React from 'react';

const SongInfoGrid = ({ song }) => {
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
            {song.preview_url && (
                <div className="info-item">
                    <label>Preview</label>
                    <audio controls src={song.preview_url} />
                </div>
            )}
        </div>
    );
};

export default SongInfoGrid;
