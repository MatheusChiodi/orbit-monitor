import { useEffect, useState } from 'react';

function query(media: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(media) : null;
}

/** Live result of a CSS media query (false where `matchMedia` is unavailable). */
export function useMediaQuery(media: string): boolean {
  const [matches, setMatches] = useState(() => query(media)?.matches ?? false);
  useEffect(() => {
    const list = query(media);
    if (!list) return;
    const onChange = (event: { matches: boolean }) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [media]);
  return matches;
}
