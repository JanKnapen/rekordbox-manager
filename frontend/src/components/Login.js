import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initCsrf, loginUser } from '../api/api';
import '../styles/Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(evt) {
        evt.preventDefault();
        setError('');
        setLoading(true);
        try {
            await initCsrf();
            const response = await loginUser({ username, password });
            localStorage.setItem('rbm_authenticated', '1');
            localStorage.setItem('rbm_user', JSON.stringify(response || { username }));
            navigate('/home');
        } catch (err) {
            const msg = err?.detail || err?.message || (typeof err === 'string' ? err : 'Login failed');
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <h1 className="app-title">RekordBox Manager</h1>
                <div className="login-box">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                required
                                className="login-input"
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="login-input"
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;