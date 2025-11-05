import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initCsrf, loginUser } from '../api/api';

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
            await initCsrf(); // ensure csrftoken cookie is set
            const response = await loginUser({ username, password });
            // Persist minimal auth state and redirect to home
            localStorage.setItem('rbm_authenticated', '1');
            localStorage.setItem('rbm_user', JSON.stringify(response || { username }));
            navigate('/home'); // redirect to home page
        } catch (err) {
            const msg = err?.detail || err?.message || (typeof err === 'string' ? err : 'Login failed');
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in…' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default Login;