import React from 'react';

// Mobile-specific info grid: omit Release Date (smaller footprint)
const SongInfoGridMobile = ({ song, bpm, musicKey }) => {
    return (
        <div className="song-info-grid" style={{ paddingTop: 0, borderTop: 'none' }}>
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

export default SongInfoGridMobile;
