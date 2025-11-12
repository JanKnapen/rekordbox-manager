import useIsMobile from '../../shared/useIsMobile';
import HomeDesktop from './Home.desktop';
import HomeMobile from './Home.mobile';

const Home = (props) => {
    const isMobile = useIsMobile();
    return isMobile ? <HomeMobile {...props} /> : <HomeDesktop {...props} />;
};

export default Home;