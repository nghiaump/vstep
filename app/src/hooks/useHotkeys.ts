import { useEffect, useRef } from 'react';

type Map = Record<string, (e: KeyboardEvent) => void>;

/** Single-key shortcuts; ignored while typing in inputs or when a modifier is held. */
export function useHotkeys(map: Map, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      const fn = ref.current[e.key] ?? ref.current[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(e); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
