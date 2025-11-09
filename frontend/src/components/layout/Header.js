import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ showHome = false, showPlaylistManager = false }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('rbm_authenticated');
        localStorage.removeItem('rbm_user');
        navigate('/login');
    };

    return (
        <header className="page-header">
            <h1>RekordBox Manager</h1>
            <div className="header-right">
                {showHome && (
                    <button onClick={() => navigate('/home')} className="home-button">
                        Home
                    </button>
                )}
                {showPlaylistManager && (
                    <button onClick={() => navigate('/playlist-manager')} className="playlist-manager-button">
                        Playlist Manager
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
