import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Home from './components/Home';
import NewSong from './components/NewSong';
import SavedSong from './components/SavedSong';
import { PrivateRoute, PublicRoute } from './components/ProtectedRoute';
import './styles/app.css';

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