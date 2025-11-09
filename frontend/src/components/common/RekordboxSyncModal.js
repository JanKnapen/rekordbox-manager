import React, { useState } from 'react';
import { syncRekordbox } from '../../api/api';
import './RekordboxSyncModal.css';

function RekordboxSyncModal({ onClose, onSuccess }) {
  const [databasePath, setDatabasePath] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSync = async (e) => {
    e.preventDefault();
    
    if (!databasePath.trim()) {
      setError('Please enter a database path');
      return;
    }

    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const response = await syncRekordbox(databasePath);
      setResult(response);
      if (onSuccess) {
        setTimeout(() => onSuccess(response), 2000);
      }
    } catch (err) {
      setError(err.error || 'Failed to sync with Rekordbox');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sync to Rekordbox</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <p><strong>How to sync:</strong></p>
            <ol>
              <li>In Rekordbox, go to <strong>File → Export Collection in XML format</strong></li>
              <li>Save the exported file (rekordbox.xml) to your computer</li>
              <li>Enter the full path to the XML file below</li>
              <li>Click "Sync" to add your playlists to Rekordbox</li>
            </ol>
            <p className="note">
              <strong>Note:</strong> This will only add new playlists and tracks. 
              Your existing Rekordbox data will not be modified.
            </p>
          </div>

          <form onSubmit={handleSync}>
            <div className="form-group">
              <label htmlFor="db-path">Rekordbox XML File Path:</label>
              <input
                id="db-path"
                type="text"
                placeholder="/path/to/rekordbox.xml"
                value={databasePath}
                onChange={(e) => setDatabasePath(e.target.value)}
                disabled={syncing}
                autoFocus
              />
              <p className="hint">
                Example: /Users/yourname/Documents/rekordbox.xml or C:\Users\yourname\Documents\rekordbox.xml
              </p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {result && (
              <div className="success-message">
                <p>✓ {result.message}</p>
                {result.added_playlists > 0 && (
                  <p className="stats">
                    Added {result.added_playlists} playlist(s) and {result.added_tracks} track(s)
                  </p>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={syncing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sync-btn"
                disabled={syncing || !databasePath.trim()}
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RekordboxSyncModal;
