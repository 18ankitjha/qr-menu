import type { IGpsCoordinates } from '../types';

// The server checks the diner is at the restaurant when they join a table (skipped in development).
// Browsers only share location over HTTPS (or localhost), so this resolves to undefined when unavailable.
export const getCoordinates = (): Promise<IGpsCoordinates | undefined> => {
  if (!navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
};
