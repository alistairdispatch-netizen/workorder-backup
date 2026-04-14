import { useState, useEffect } from 'react';

/**
 * React hook that listens to a CSS media query.
 * @param {string} query - CSS media query string, e.g. "(min-width: 768px)"
 * @returns {boolean} true if the query matches, false otherwise
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    // Modern browsers
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
