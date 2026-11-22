// ============================================================
// GPS Utility — Haversine formula for distance calculation
// ============================================================

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Calculates the distance between two GPS coordinates using the Haversine formula.
 * @returns Distance in meters
 */
export const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Checks if the customer is within the allowed radius of the restaurant.
 */
export const isWithinRadius = (
  customerLat: number,
  customerLon: number,
  restaurantLat: number,
  restaurantLon: number,
  radiusMeters: number
): boolean => {
  const distance = calculateDistanceInMeters(
    customerLat,
    customerLon,
    restaurantLat,
    restaurantLon
  );
  return distance <= radiusMeters;
};
