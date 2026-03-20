import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceManager } from '../PresenceManager.js';
import { getGeohashCells, encodeGeohash } from '../GeoLocationService.js';
import type { UserRecord } from '../types.js';

function makeMockWs() {
  return {
    terminate: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    readyState: 1,
  } as unknown as UserRecord['ws'];
}

function makeRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    nickname: 'alice',
    tag: 'ABCD',
    aiCli: 'Claude Code',
    lat: 37.5665,
    lon: 126.9780,
    ws: makeMockWs(),
    lastHeartbeat: Date.now(),
    status: 'online',
    ...overrides,
  };
}

describe('PresenceManager', () => {
  let pm: PresenceManager;

  beforeEach(() => {
    vi.useFakeTimers();
    pm = new PresenceManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('register/unregister/getUser lifecycle', () => {
    it('registers a user and retrieves it', () => {
      const record = makeRecord();
      pm.register('alice#ABCD', record);
      expect(pm.getUser('alice#ABCD')).toBe(record);
      expect(pm.getUserCount()).toBe(1);
    });

    it('unregisters a user', () => {
      pm.register('alice#ABCD', makeRecord());
      pm.unregister('alice#ABCD');
      expect(pm.getUser('alice#ABCD')).toBeUndefined();
      expect(pm.getUserCount()).toBe(0);
    });

    it('returns undefined for non-existent user', () => {
      expect(pm.getUser('nobody')).toBeUndefined();
    });
  });

  describe('heartbeat', () => {
    it('updates lastHeartbeat timestamp', () => {
      const record = makeRecord({ lastHeartbeat: 1000 });
      pm.register('alice#ABCD', record);

      vi.setSystemTime(new Date(5000));
      pm.heartbeat('alice#ABCD');

      expect(pm.getUser('alice#ABCD')!.lastHeartbeat).toBe(5000);
    });

    it('does nothing for non-existent user', () => {
      // Should not throw
      pm.heartbeat('nobody');
    });
  });

  describe('checkStaleUsers', () => {
    it('marks users stale after 60s without heartbeat', () => {
      const record = makeRecord({ lastHeartbeat: 0 });
      pm.register('alice#ABCD', record);

      // Advance past STALE_TIMEOUT_MS (60_000)
      vi.setSystemTime(new Date(61_000));

      const stale = pm.checkStaleUsers();
      expect(stale).toEqual(['alice#ABCD']);
      expect(pm.getUser('alice#ABCD')!.status).toBe('offline');
    });

    it('does not mark recently heartbeated users as stale', () => {
      const record = makeRecord({ lastHeartbeat: 50_000 });
      pm.register('alice#ABCD', record);

      vi.setSystemTime(new Date(60_000));

      const stale = pm.checkStaleUsers();
      expect(stale).toHaveLength(0);
      expect(pm.getUser('alice#ABCD')!.status).toBe('online');
    });

    it('does not re-mark already offline users', () => {
      const record = makeRecord({ lastHeartbeat: 0, status: 'offline' });
      pm.register('alice#ABCD', record);

      vi.setSystemTime(new Date(120_000));

      const stale = pm.checkStaleUsers();
      expect(stale).toHaveLength(0); // Already offline, not returned again
    });
  });

  describe('duplicate session handling', () => {
    it('terminates old WebSocket when re-registering same ID', () => {
      const oldWs = makeMockWs();
      const oldRecord = makeRecord({ ws: oldWs });
      pm.register('alice#ABCD', oldRecord);

      const newWs = makeMockWs();
      const newRecord = makeRecord({ ws: newWs });
      pm.register('alice#ABCD', newRecord);

      expect(oldWs.terminate).toHaveBeenCalledOnce();
      expect(pm.getUser('alice#ABCD')!.ws).toBe(newWs);
      expect(pm.getUserCount()).toBe(1);
    });
  });

  describe('getNearbyUsers', () => {
    it('returns nearby users as NearbyUser array', () => {
      // Origin user at Seoul center
      pm.register('alice#ABCD', makeRecord({
        nickname: 'alice',
        tag: 'ABCD',
        lat: 37.5665,
        lon: 126.9780,
      }));

      // Nearby user ~0.5km away
      pm.register('bob#1234', makeRecord({
        nickname: 'bob',
        tag: '1234',
        aiCli: 'Cursor',
        lat: 37.5640,
        lon: 126.9800,
      }));

      const nearby = pm.getNearbyUsers('alice#ABCD', 5);
      expect(nearby).toHaveLength(1);
      expect(nearby[0]!.nickname).toBe('bob');
      expect(nearby[0]!.tag).toBe('1234');
      expect(nearby[0]!.aiCli).toBe('Cursor');
      expect(nearby[0]!.status).toBe('online');
      expect(nearby[0]!.distance).toBeGreaterThanOrEqual(0);
    });

    it('returns empty array for non-existent origin', () => {
      expect(pm.getNearbyUsers('nobody', 5)).toEqual([]);
    });
  });

  describe('geohash spatial index', () => {
    it('getGeohashCells returns center + 8 neighbors (9 cells)', () => {
      const cells = getGeohashCells(37.5665, 126.978);
      expect(cells).toHaveLength(9);
      // First element is the center cell
      const center = encodeGeohash(37.5665, 126.978);
      expect(cells[0]).toBe(center);
      // All cells should be unique strings
      const unique = new Set(cells);
      expect(unique.size).toBe(9);
    });

    it('register adds user to geohash index', () => {
      const record = makeRecord({ lat: 37.5665, lon: 126.978 });
      pm.register('alice#ABCD', record);

      // getUsersInRadius from same location should NOT include self when excluded
      const result = pm.getUsersInRadius(37.5665, 126.978, 10, 'alice#ABCD');
      expect(result).toHaveLength(0);
    });

    it('getUsersInRadius finds nearby users', () => {
      // User A at Seoul center
      pm.register('alice#ABCD', makeRecord({
        nickname: 'alice', tag: 'ABCD',
        lat: 37.5665, lon: 126.978,
      }));
      // User B very close (~0.3km)
      pm.register('bob#1234', makeRecord({
        nickname: 'bob', tag: '1234',
        lat: 37.564, lon: 126.980,
      }));

      const result = pm.getUsersInRadius(37.5665, 126.978, 10, 'alice#ABCD');
      expect(result).toHaveLength(1);
      expect(result).toContain('bob#1234');
    });

    it('unregister removes user from geohash index', () => {
      pm.register('alice#ABCD', makeRecord({ lat: 37.5665, lon: 126.978 }));
      pm.register('bob#1234', makeRecord({
        nickname: 'bob', tag: '1234',
        lat: 37.564, lon: 126.980,
      }));

      pm.unregister('bob#1234');

      const result = pm.getUsersInRadius(37.5665, 126.978, 10, 'alice#ABCD');
      expect(result).toHaveLength(0);
    });

    it('far-away user (Busan) is not found in 10km radius from Seoul', () => {
      pm.register('alice#ABCD', makeRecord({
        nickname: 'alice', tag: 'ABCD',
        lat: 37.5665, lon: 126.978,
      }));
      // Busan user
      pm.register('faruser#9999', makeRecord({
        nickname: 'faruser', tag: '9999',
        lat: 35.1796, lon: 129.0756,
      }));

      const result = pm.getUsersInRadius(37.5665, 126.978, 10, 'alice#ABCD');
      expect(result).toHaveLength(0);
    });

    it('excludes offline users from getUsersInRadius', () => {
      pm.register('alice#ABCD', makeRecord({ lat: 37.5665, lon: 126.978 }));
      pm.register('bob#1234', makeRecord({
        nickname: 'bob', tag: '1234',
        lat: 37.564, lon: 126.980,
        status: 'offline',
      }));

      const result = pm.getUsersInRadius(37.5665, 126.978, 10, 'alice#ABCD');
      expect(result).toHaveLength(0);
    });

    it('getNearbyUsers regression — returns NearbyUser[] with same fields', () => {
      pm.register('alice#ABCD', makeRecord({
        nickname: 'alice', tag: 'ABCD',
        lat: 37.5665, lon: 126.978,
      }));
      pm.register('bob#1234', makeRecord({
        nickname: 'bob', tag: '1234',
        aiCli: 'Cursor',
        lat: 37.564, lon: 126.980,
      }));

      const nearby = pm.getNearbyUsers('alice#ABCD', 5);
      expect(nearby).toHaveLength(1);
      expect(nearby[0]).toMatchObject({
        nickname: 'bob',
        tag: '1234',
        aiCli: 'Cursor',
        status: 'online',
      });
      expect(typeof nearby[0]!.distance).toBe('number');
      expect(nearby[0]!.distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllOnlineUsers', () => {
    it('returns only online users', () => {
      pm.register('alice#ABCD', makeRecord({ status: 'online' }));
      pm.register('bob#1234', makeRecord({ nickname: 'bob', tag: '1234', status: 'offline' }));
      pm.register('carol#5678', makeRecord({ nickname: 'carol', tag: '5678', status: 'online' }));

      const online = pm.getAllOnlineUsers();
      expect(online).toHaveLength(2);
      expect(online.every((u) => u.status === 'online')).toBe(true);
    });
  });
});
