import useMediaQuery from '../../shared/useMediaQuery';
import HomeDesktop from './Home.desktop';
import HomeMobile from './Home.mobile';

const Home = (props) => {
    const isMobile = useMediaQuery('(max-width: 640px)');
    return isMobile ? <HomeMobile {...props} /> : <HomeDesktop {...props} />;
};

export default Home;