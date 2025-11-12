import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openInNewTabOrNavigate } from '../../utils/navHelper';
import { FiMenu, FiX, FiRefreshCw } from 'react-icons/fi';
import './Header.mobile.css';

const HeaderMobile = ({ showHome = false, showPlaylistManager = false, showSync = false, onSyncClick }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const menuRef = useRef();

    useEffect(() => {
        const onDocClick = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('rbm_authenticated');
        localStorage.removeItem('rbm_user');
        navigate('/login');
    };

    return (
        <header className="page-header mobile">
            <h1>RekordBox Manager</h1>
            <div className="mobile-menu" ref={menuRef}>
                <button className="menu-toggle" onClick={() => setOpen((s) => !s)} aria-expanded={open} aria-label="Open menu">
                    {open ? <FiX /> : <FiMenu />}
                </button>
                {open && (
                    <div className="menu-dropdown">
                        {showHome && (
                            <button onClick={(e) => openInNewTabOrNavigate(e, navigate, '/home')} onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, '/home')} className="menu-item">
                                Home
                            </button>
                        )}
                        {showPlaylistManager && (
                            <button onClick={(e) => openInNewTabOrNavigate(e, navigate, '/playlist-manager')} onAuxClick={(e) => openInNewTabOrNavigate(e, navigate, '/playlist-manager')} className="menu-item">
                                Playlist Manager
                            </button>
                        )}
                        {showSync && (
                            <button onClick={onSyncClick} className="menu-item sync-item">
                                <FiRefreshCw /> Sync
                            </button>
                        )}
                        <button onClick={handleLogout} className="menu-item logout-item">
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default HeaderMobile;
