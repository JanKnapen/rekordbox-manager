import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import './ConfirmDeleteButton.css';

/**
 * A reusable delete button component with double-click confirmation
 * 
 * @param {Object} props
 * @param {Function} props.onDelete - Callback function when delete is confirmed
 * @param {boolean} props.isConfirming - Whether this button is in confirmation state
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.title - Tooltip text (optional)
 */
function ConfirmDeleteButton({ onDelete, isConfirming, className = '', title }) {
    const defaultTitle = isConfirming ? "Click again to confirm" : "Remove";
    
    return (
        <button
            className={`confirm-delete-button ${isConfirming ? 'confirm' : ''} ${className}`}
            onClick={onDelete}
            title={title || defaultTitle}
        >
            {isConfirming ? <FaExclamationTriangle /> : <FaTimes />}
        </button>
    );
}

export default ConfirmDeleteButton;
