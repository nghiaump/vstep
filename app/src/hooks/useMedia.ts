import { useSyncExternalStore } from 'react';

/** Reactive CSS media query (used to render exactly one layout instead of hiding duplicates with CSS). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => matchMedia(query).matches,
    () => false,
  );
}
