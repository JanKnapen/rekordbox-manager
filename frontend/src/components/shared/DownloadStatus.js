import React from 'react';
import { FaCheck, FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const DownloadStatus = ({ status, progress, onRetry }) => {
    if (!status) return null;

    const getStatusMessage = () => {
        if (status === 'downloading' && progress < 80) {
            return `Downloading: ${progress}%`;
        } else if (status === 'downloading' && progress >= 80) {
            return `Converting: ${progress}%`;
        } else if (status === 'analyzing') {
            return `Analyzing: ${progress}%`;
        }
        return '';
    };

    return (
        <div className="download-status-container">
            {status === 'pending' && (
                <div className="download-status pending">
                    <span>Download pending...</span>
                </div>
            )}
            {(status === 'downloading' || status === 'analyzing') && (
                <div className="download-status downloading">
                    <span>{getStatusMessage()}</span>
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
                    <span>Download and analysis completed</span>
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
