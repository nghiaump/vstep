import { useEffect, useState } from 'react';

/** Re-renders on an interval and returns Date.now(); aligned to whole seconds for crisp clocks. */
export function useNow(active = true, ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let t: number;
    const tick = () => {
      setNow(Date.now());
      t = window.setTimeout(tick, ms - (Date.now() % ms) + 5);
    };
    tick();
    return () => clearTimeout(t);
  }, [active, ms]);
  return now;
}
