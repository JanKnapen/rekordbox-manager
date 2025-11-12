import React from 'react';
import './SongDetails.mobile.css';

// Mobile-presentational header: more compact spacing. Album and release date
// are intentionally omitted in mobile child components.
const SongDetailsMobile = ({ title, metaLine, actionButton, children }) => {
  return (
    <div className="song-details">
      {children}
    </div>
  );
};

export default SongDetailsMobile;
