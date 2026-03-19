import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeIp, lookupIp, getDistanceKm, findNearbyUsers } from '../GeoLocationService.js';
import type { UserRecord } from '../types.js';

// Mock geoip-lite
vi.mock('geoip-lite', () => ({
  default: {
    lookup: vi.fn((ip: string) => {
      if (ip === '8.8.8.8') {
        return { ll: [37.386, -122.0838], city: 'Mountain View', country: 'US' };
      }
      if (ip === '1.1.1.1') {
        return { ll: [-33.8688, 151.2093], city: 'Sydney', country: 'AU' };
      }
      return null;
    }),
  },
}));

describe('GeoLocationService', () => {
  describe('normalizeIp', () => {
    it('strips ::ffff: prefix from IPv6-mapped IPv4', () => {
      expect(normalizeIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
    });

    it('returns plain IPv4 unchanged', () => {
      expect(normalizeIp('1.2.3.4')).toBe('1.2.3.4');
    });

    it('returns regular IPv6 unchanged', () => {
      expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    });
  });

  describe('lookupIp', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns GeoResult for a public IP', () => {
      const result = lookupIp('8.8.8.8');
      expect(result).not.toBeNull();
      expect(result!.lat).toBeCloseTo(37.386, 1);
      expect(result!.lon).toBeCloseTo(-122.0838, 1);
      expect(result!.city).toBe('Mountain View');
    });

    it('returns null for 127.0.0.1 without dev env', () => {
      delete process.env['DEV_GEO_LAT'];
      delete process.env['DEV_GEO_LON'];
      expect(lookupIp('127.0.0.1')).toBeNull();
    });

    it('returns dev fallback for private IP with DEV_GEO env vars', () => {
      process.env['DEV_GEO_LAT'] = '37.5665';
      process.env['DEV_GEO_LON'] = '126.9780';
      const result = lookupIp('127.0.0.1');
      expect(result).not.toBeNull();
      expect(result!.lat).toBeCloseTo(37.5665, 2);
      expect(result!.lon).toBeCloseTo(126.9780, 2);
      expect(result!.city).toBe('Dev');
    });

    it('returns dev fallback for ::ffff:192.168.1.1 with DEV_GEO env vars', () => {
      process.env['DEV_GEO_LAT'] = '35.6762';
      process.env['DEV_GEO_LON'] = '139.6503';
      const result = lookupIp('::ffff:192.168.1.1');
      expect(result).not.toBeNull();
      expect(result!.lat).toBeCloseTo(35.6762, 2);
    });

    it('handles IPv6-mapped public IP', () => {
      const result = lookupIp('::ffff:8.8.8.8');
      expect(result).not.toBeNull();
      expect(result!.city).toBe('Mountain View');
    });
  });

  describe('getDistanceKm', () => {
    it('calculates Seoul to Gangnam as approximately 8km', () => {
      const seoul = { lat: 37.5665, lon: 126.9780 };
      const gangnam = { lat: 37.4979, lon: 127.0276 };
      const distance = getDistanceKm(seoul, gangnam);
      expect(distance).toBeGreaterThan(7);
      expect(distance).toBeLessThan(9);
    });

    it('returns 0 for same location', () => {
      const point = { lat: 37.5665, lon: 126.9780 };
      expect(getDistanceKm(point, point)).toBe(0);
    });
  });

  describe('findNearbyUsers', () => {
    function makeUser(overrides: Partial<UserRecord>): UserRecord {
      return {
        nickname: 'test',
        tag: '0000',
        aiCli: 'Claude Code',
        lat: 0,
        lon: 0,
        ws: {} as UserRecord['ws'],
        lastHeartbeat: Date.now(),
        status: 'online',
        ...overrides,
      };
    }

    it('includes user within radius and excludes user outside', () => {
      const origin = { lat: 37.5665, lon: 126.9780 }; // Seoul center
      const users = new Map<string, UserRecord>();

      // ~8km away (Gangnam) - outside 3km radius
      users.set('far', makeUser({ lat: 37.4979, lon: 127.0276 }));

      // ~1km away
      users.set('near', makeUser({ lat: 37.5600, lon: 126.9850 }));

      const result = findNearbyUsers(origin, users, 3);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('near');
    });

    it('returns results sorted by distance ascending', () => {
      const origin = { lat: 37.5665, lon: 126.9780 };
      const users = new Map<string, UserRecord>();

      users.set('medium', makeUser({ lat: 37.5550, lon: 126.9900 })); // ~1.7km
      users.set('close', makeUser({ lat: 37.5650, lon: 126.9790 })); // ~0.2km
      users.set('far', makeUser({ lat: 37.5400, lon: 127.0000 })); // ~3.5km

      const result = findNearbyUsers(origin, users, 5);
      expect(result.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.distance).toBeGreaterThanOrEqual(result[i - 1]!.distance);
      }
    });

    it('excludes the origin user by excludeId', () => {
      const origin = { lat: 37.5665, lon: 126.9780 };
      const users = new Map<string, UserRecord>();
      users.set('self', makeUser({ lat: 37.5665, lon: 126.9780 }));
      users.set('other', makeUser({ lat: 37.5660, lon: 126.9785 }));

      const result = findNearbyUsers(origin, users, 10, 'self');
      expect(result.every((r) => r.id !== 'self')).toBe(true);
    });

    it('excludes offline users', () => {
      const origin = { lat: 37.5665, lon: 126.9780 };
      const users = new Map<string, UserRecord>();
      users.set('offline-user', makeUser({ lat: 37.5660, lon: 126.9785, status: 'offline' }));

      const result = findNearbyUsers(origin, users, 10);
      expect(result).toHaveLength(0);
    });

    it('returns empty array when no users in range', () => {
      const origin = { lat: 37.5665, lon: 126.9780 };
      const users = new Map<string, UserRecord>();
      users.set('tokyo', makeUser({ lat: 35.6762, lon: 139.6503 })); // ~1100km

      const result = findNearbyUsers(origin, users, 10);
      expect(result).toHaveLength(0);
    });
  });
});
