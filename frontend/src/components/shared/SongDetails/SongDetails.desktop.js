import React from 'react';
import './SongDetails.desktop.css';

const SongDetailsDesktop = ({ title, metaLine, actionButton, children }) => {
  return (
    <div className="song-details">
      {children}
    </div>
  );
};

export default SongDetailsDesktop;
