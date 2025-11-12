import React from 'react';
import './SongDetails.css';

// Presentational header used across song pages. This component intentionally
// does NOT render a left icon — playlist-specific iconography belongs in
// a dedicated PlaylistDetails component.
const SongDetails = ({ title, metaLine, actionButton, children }) => {
  return (
    <div className="song-details">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="song-header-info">
            {title && <h2 style={{ marginBottom: '0.25rem' }}>{title}</h2>}
            {metaLine && (
              <div className="album" style={{ marginTop: '0.5rem' }}>
                {metaLine}
              </div>
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

export default SongDetails;
