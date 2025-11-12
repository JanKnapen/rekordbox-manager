import React from 'react';
import { useNavigate } from 'react-router-dom';
import { openInNewTabOrNavigate } from '../../utils/navHelper';
import { FiRefreshCw } from 'react-icons/fi';
import './Header.desktop.css';

const Header = ({ showHome = false, showPlaylistManager = false, showSync = false, onSyncClick }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear all local storage on logout so mobile/desktop persisted UI state is reset
        try { localStorage.clear(); } catch (e) {}
        navigate('/login');
    };

    return (
        <header className="page-header">
            <h1>RekordBox Manager</h1>
            <div className="header-right">
                {showHome && (
                    <button onClick={(e) => openInNewTabOrNavigate(e, navigate, '/home')} onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, '/home')} className="home-button">
                        Home
                    </button>
                )}
                {showPlaylistManager && (
                    <button onClick={(e) => openInNewTabOrNavigate(e, navigate, '/playlist-manager')} onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, '/playlist-manager')} className="playlist-manager-button">
                        Playlist Manager
                    </button>
                )}
                {showSync && (
                    <button onClick={onSyncClick} className="sync-button" title="Sync to Rekordbox">
                        <FiRefreshCw /> Sync
                    </button>
                )}
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Header;
