import React from 'react';
import './SongMetadata.css';

function SongMetadata({ bpm, musicKey, className = '' }) {
  // Don't render if no data
  if (!bpm && !musicKey) {
    return null;
  }

  return (
    <div className={`song-metadata ${className}`}>
      {bpm && <span className="bpm">{Math.round(bpm)} BPM</span>}
      {musicKey && <span className="key">{musicKey}</span>}
    </div>
  );
}

export default SongMetadata;
