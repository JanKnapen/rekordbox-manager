import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Home from './components/pages/Home';
import NewSong from './components/pages/NewSong';
import SavedSong from './components/pages/SavedSong';
import PlaylistManager from './components/pages/PlaylistManager';
import { PrivateRoute, PublicRoute } from './components/auth/ProtectedRoute';
import './app.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route 
                    path="/login" 
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    } 
                />
                <Route
                    path="/home"
                    element={
                        <PrivateRoute>
                            <Home />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/playlist-manager"
                    element={
                        <PrivateRoute>
                            <PlaylistManager />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/new_song/:id"
                    element={
                        <PrivateRoute>
                            <NewSong />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/saved_song/:id"
                    element={
                        <PrivateRoute>
                            <SavedSong />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/"
                    element={
                        localStorage.getItem('rbm_authenticated') === '1' ? 
                            <Navigate to="/home" replace /> : 
                            <Navigate to="/login" replace />
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;