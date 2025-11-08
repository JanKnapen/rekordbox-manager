import React from 'react';
import { FaCheck, FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const DownloadStatus = ({ status, progress, onRetry }) => {
    if (!status) return null;

    return (
        <div className="download-status-container">
            {status === 'pending' && (
                <div className="download-status pending">
                    <span>Download pending...</span>
                </div>
            )}
            {status === 'downloading' && (
                <div className="download-status downloading">
                    <span>Downloading: {progress}%</span>
                    <div className="progress-bar">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
            {status === 'completed' && (
                <div className="download-status success">
                    <FaCheck style={{ marginRight: '0.5rem' }} />
                    <span>Download completed</span>
                </div>
            )}
            {status === 'failed' && (
                <div className="download-status failed">
                    <FaExclamationTriangle style={{ marginRight: '0.5rem' }} />
                    <span>Download failed</span>
                    <button 
                        className="retry-button"
                        onClick={onRetry}
                    >
                        <FaRedo style={{ marginRight: '0.5rem' }} />
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};

export default DownloadStatus;
