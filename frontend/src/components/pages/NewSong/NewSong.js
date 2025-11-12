import useIsMobile from '../../shared/useIsMobile';
import NewSongDesktop from './NewSong.desktop';
import NewSongMobile from './NewSong.mobile';

const NewSong = (props) => {
    const isMobile = useIsMobile();
    return isMobile ? <NewSongMobile {...props} /> : <NewSongDesktop {...props} />;
};

export default NewSong;