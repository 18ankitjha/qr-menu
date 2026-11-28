import type { IGpsCoordinates } from '../types';

// The server checks the diner is at the restaurant when they join a table (skipped in development).
// Browsers only share location over HTTPS (or localhost) and only after the person allows it.

export type LocationProblem = 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'INSECURE';

export interface LocationResult {
  coords?: IGpsCoordinates;
  problem?: LocationProblem;
}

const PROBLEM_BY_CODE: Record<number, LocationProblem> = { 1: 'DENIED', 2: 'UNAVAILABLE', 3: 'TIMEOUT' };

/**
 * Calls the browser right away (no await before it), so when this runs inside a button tap
 * the browser treats it as the person's own request and shows its "Allow location?" prompt.
 */
export const getLocation = (): Promise<LocationResult> => {
  if (!window.isSecureContext) return Promise.resolve({ problem: 'INSECURE' });
  if (!navigator.geolocation) return Promise.resolve({ problem: 'UNSUPPORTED' });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
      (err) => resolve({ problem: PROBLEM_BY_CODE[err.code] ?? 'UNAVAILABLE' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
  });
};

/** iPhone / iPad (iPadOS reports itself as a Mac with touch). */
export const isAppleMobile = (): boolean =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
