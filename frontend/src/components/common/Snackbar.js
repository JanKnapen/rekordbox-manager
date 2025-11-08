import React, { useEffect } from 'react';
import './Snackbar.css';

function Snackbar({ message, type = 'success', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`snackbar snackbar-${type}`}>
      {message}
    </div>
  );
}

export default Snackbar;
