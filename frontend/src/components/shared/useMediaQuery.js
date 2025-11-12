import { useState, useEffect } from 'react';

// Simple hook to match a media query. Returns true when the query matches.
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    // modern browsers
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    // sync initial value in case it changed
    setMatches(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, [query]);

  return matches;
}
