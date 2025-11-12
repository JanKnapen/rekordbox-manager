import React from 'react';

const SongHeaderDesktop = ({ song }) => {
    return (
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
    );
};

export default SongHeaderDesktop;
