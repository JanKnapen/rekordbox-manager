import useMediaQuery from '../../shared/useMediaQuery';
import LoginDesktop from './Login.desktop';
import LoginMobile from './Login.mobile';

// Responsive entry that renders a mobile or desktop login based on viewport
const Login = (props) => {
    const isMobile = useMediaQuery('(max-width: 640px)');
    return isMobile ? <LoginMobile {...props} /> : <LoginDesktop {...props} />;
};

export default Login;
