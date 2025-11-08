import { Navigate } from 'react-router-dom';

export const PrivateRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('rbm_authenticated') === '1';
    
    if (!isAuthenticated) {
        // Redirect them to the /login page
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

export const PublicRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('rbm_authenticated') === '1';
    
    if (isAuthenticated) {
        // Redirect them to the /home page
        return <Navigate to="/home" replace />;
    }
    
    return children;
};