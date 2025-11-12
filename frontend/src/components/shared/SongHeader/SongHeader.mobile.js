import React from 'react';

const SongHeaderMobile = ({ song = {} }) => {
    const formatDuration = (ms) => {
        if (ms === null || ms === undefined) return '';
        const m = Math.floor(ms / 60000);
        const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
        return `${m}:${s}`;
    };

    const duration = formatDuration(song.duration_ms);

    return (
        <div
            className="song-header"
            style={{
                alignItems: 'center',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'space-between'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <div className="song-icon-mobile" style={{ flexShrink: 0 }}>
                    {song.icon ? (
                        <img
                            src={song.icon}
                            alt={song.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                        />
                    ) : (
                        <div className="placeholder-icon-large" style={{ fontSize: '1.25rem', width: '100%', height: '100%' }}>
                            ♪
                        </div>
                    )}
                </div>

                <div className="song-header-info" style={{ marginLeft: 0, minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.title}
                    </h2>
                    <p className="artist" style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.artist}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.95rem', flexShrink: 0 }}>
                {duration}
            </div>
        </div>
    );
};

export default SongHeaderMobile;
