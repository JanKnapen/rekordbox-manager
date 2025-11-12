import React from 'react';
import './SongDetails.css';

// PlaylistDetails renders a large playlist icon to the left and then reuses
// the same header styling used by SongDetails. It accepts an optional
// `icon` prop (URL or element) and falls back to an emoji.
const PlaylistDetails = ({ title, metaLine, icon, actionButton, children }) => {
  const renderIcon = () => {
    if (!icon) return '📁';
    // If icon is a string, assume it's a URL to an image
    if (typeof icon === 'string') {
      return <img src={icon} alt={title || 'playlist'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />;
    }
    // Otherwise assume it's a React element
    return icon;
  };

  return (
    <div className="song-details">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="placeholder-icon-large" style={{ width: 120, height: 120, fontSize: '2rem' }}>
            {renderIcon()}
          </div>
          <div className="song-header-info">
            {title && <h2 style={{ marginBottom: '0.25rem' }}>{title}</h2>}
            {metaLine && (
              <div className="album" style={{ marginTop: '0.5rem' }}>{metaLine}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {actionButton}
        </div>
      </div>

      {children}
    </div>
  );
};

export default PlaylistDetails;
