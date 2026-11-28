import { useEffect, useState } from 'react';

const toSeconds = (ms: number | undefined): number => (ms && ms > 0 ? Math.ceil(ms / 1000) : 0);

/**
 * Seconds left of a server cooldown, ticking down every second.
 * `ms` is the time left when the response arrived; a new value (fresh response) restarts the count.
 */
export const useCooldown = (ms: number | undefined): number => {
  const [prevMs, setPrevMs] = useState(ms);
  const [left, setLeft] = useState(() => toSeconds(ms));
  if (ms !== prevMs) {
    setPrevMs(ms);
    setLeft(toSeconds(ms));
  }

  useEffect(() => {
    if (!ms || ms <= 0) return;
    const until = Date.now() + ms;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(seconds);
      if (seconds === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ms]);

  return left;
};
