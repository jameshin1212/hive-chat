import haversine from 'haversine';
import { encodeBase32, getNeighborsBase32 } from 'geohashing';
import type { GeoResult, UserRecord } from './types.js';

const GEOHASH_PRECISION = 5; // ~5km cells

/**
 * Encode lat/lon to a geohash string at precision 5.
 */
export function encodeGeohash(lat: number, lon: number): string {
  return encodeBase32(lat, lon, GEOHASH_PRECISION);
}

/**
 * Get center geohash cell + 8 neighbors for a given coordinate.
 * Returns 9 geohash strings covering the area around the point.
 */
export function getGeohashCells(lat: number, lon: number): string[] {
  const center = encodeBase32(lat, lon, GEOHASH_PRECISION);
  const n = getNeighborsBase32(center);
  return [center, n.north, n.northEast, n.east, n.southEast, n.south, n.southWest, n.west, n.northWest];
}

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

// --- IP Geolocation Cache (1 hour TTL) ---
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;
const geoCache = new Map<string, { result: GeoResult; expiresAt: number }>();

/**
 * Lookup IP address to geographic coordinates using ip-api.com.
 * Results are cached for 1 hour.
 * For private/loopback IPs: uses DEV_GEO_LAT/DEV_GEO_LON env vars as fallback.
 */
export async function lookupIp(ip: string): Promise<GeoResult | null> {
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

  // Check cache
  const cached = geoCache.get(normalized);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  try {
    // ip-api.com free tier: 45 req/min, no API key needed
    const res = await fetch(`http://ip-api.com/json/${normalized}?fields=status,lat,lon,city,country`);
    const data = await res.json() as { status: string; lat?: number; lon?: number; city?: string; country?: string };

    if (data.status !== 'success' || data.lat == null || data.lon == null) {
      return null;
    }

    const result: GeoResult = {
      lat: data.lat,
      lon: data.lon,
      city: data.city || 'Unknown',
      country: data.country || 'Unknown',
    };

    geoCache.set(normalized, { result, expiresAt: Date.now() + GEO_CACHE_TTL_MS });
    return result;
  } catch {
    return null;
  }
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
