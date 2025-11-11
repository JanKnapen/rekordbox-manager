import React from 'react';

const SongItem = ({ song, onClick, actionButton, children }) => {
    return (
        <div 
                className="song-item"
                onClick={onClick}
                onAuxClick={onClick}
                style={{ cursor: onClick ? 'pointer' : 'default' }}
            >
            <div className="song-icon">
                {song.icon ? (
                    <img src={song.icon} alt={song.title} />
                ) : (
                    <div className="placeholder-icon">♪</div>
                )}
            </div>
            <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.artist}</div>
            </div>
            {children}
            {actionButton}
        </div>
    );
};

export default SongItem;
