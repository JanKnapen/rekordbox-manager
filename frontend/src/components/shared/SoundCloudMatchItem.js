import React from 'react';
import { FaExternalLinkAlt, FaCheck } from 'react-icons/fa';

const SoundCloudMatchItem = ({ track, isSelected, onSelect, onSave, saving }) => {
    return (
        <div
            className={`song-item ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(track.id);
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
            {isSelected && (
                <button 
                    className="match-select-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSave(track);
                    }}
                    disabled={saving}
                >
                    <FaCheck />
                </button>
            )}
        </div>
    );
};

export default SoundCloudMatchItem;
