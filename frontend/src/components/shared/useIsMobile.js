import useMediaQuery from './useMediaQuery';

// Returns true only when both the viewport is small and the user-agent
// looks like a mobile device. This lets "Request Desktop Site" (browser UA)
// show the desktop version while still using media-query-driven layouts by default.
export default function useIsMobile() {
  const isSmallScreen = useMediaQuery('(max-width: 640px)');
  const isMobileUA = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isSmallScreen && isMobileUA;
}
