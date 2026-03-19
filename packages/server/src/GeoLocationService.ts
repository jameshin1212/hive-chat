import geoip from 'geoip-lite';
import haversine from 'haversine';
import type { GeoResult, UserRecord } from './types.js';

/**
 * Strip IPv6-mapped IPv4 prefix (::ffff:) to get plain IPv4.
 */
export function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^localhost$/,
];

function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(normalized));
}

/**
 * Lookup IP address to geographic coordinates.
 * For private/loopback IPs: uses DEV_GEO_LAT/DEV_GEO_LON env vars as fallback.
 * Returns null if lookup fails and no dev fallback is set.
 */
export function lookupIp(ip: string): GeoResult | null {
  const normalized = normalizeIp(ip);

  if (isPrivateIp(normalized)) {
    const devLat = process.env['DEV_GEO_LAT'];
    const devLon = process.env['DEV_GEO_LON'];
    if (devLat && devLon) {
      return {
        lat: parseFloat(devLat),
        lon: parseFloat(devLon),
        city: 'Dev',
        country: 'Dev',
      };
    }
    return null;
  }

  const geo = geoip.lookup(normalized);
  if (!geo || !geo.ll) {
    return null;
  }

  return {
    lat: geo.ll[0]!,
    lon: geo.ll[1]!,
    city: geo.city || 'Unknown',
    country: geo.country || 'Unknown',
  };
}

/**
 * Calculate distance in km between two points using haversine formula.
 */
export function getDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  return haversine(
    { latitude: a.lat, longitude: a.lon },
    { latitude: b.lat, longitude: b.lon },
    { unit: 'km' },
  );
}

/**
 * Find users within a given radius from origin, sorted by distance ascending.
 * Excludes the origin user. Rounds distance to 1 decimal place.
 */
export function findNearbyUsers(
  origin: { lat: number; lon: number },
  users: Map<string, UserRecord>,
  radiusKm: number,
  excludeId?: string,
): Array<{ id: string; distance: number }> {
  const results: Array<{ id: string; distance: number }> = [];

  for (const [id, user] of users) {
    if (id === excludeId) continue;
    if (user.status !== 'online') continue;

    const distance = getDistanceKm(origin, { lat: user.lat, lon: user.lon });
    const rounded = Math.round(distance * 10) / 10;

    if (rounded <= radiusKm) {
      results.push({ id, distance: rounded });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results;
}
