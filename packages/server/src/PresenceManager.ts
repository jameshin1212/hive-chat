import { STALE_TIMEOUT_MS } from '@hivechat/shared';
import type { NearbyUser } from '@hivechat/shared';
import type { UserRecord } from './types.js';
import { encodeGeohash, getGeohashCells, getDistanceKm } from './GeoLocationService.js';

export class PresenceManager {
  private users = new Map<string, UserRecord>();
  private geohashIndex = new Map<string, Set<string>>();
  private userGeohash = new Map<string, string>();

  /**
   * Register a user. If a user with the same ID already exists,
   * terminate the old WebSocket and replace with the new record.
   */
  register(id: string, record: UserRecord): void {
    const existing = this.users.get(id);
    if (existing) {
      existing.ws.terminate();
      this.removeFromGeohashIndex(id);
    }
    this.users.set(id, record);

    // Add to geohash index
    const hash = encodeGeohash(record.lat, record.lon);
    this.userGeohash.set(id, hash);
    let set = this.geohashIndex.get(hash);
    if (!set) {
      set = new Set<string>();
      this.geohashIndex.set(hash, set);
    }
    set.add(id);
  }

  /**
   * Remove a user from the registry.
   */
  unregister(id: string): void {
    this.removeFromGeohashIndex(id);
    this.users.delete(id);
  }

  /**
   * Remove a user from the geohash index.
   */
  private removeFromGeohashIndex(id: string): void {
    const hash = this.userGeohash.get(id);
    if (!hash) return;

    const set = this.geohashIndex.get(hash);
    if (set) {
      set.delete(id);
      if (set.size === 0) {
        this.geohashIndex.delete(hash);
      }
    }
    this.userGeohash.delete(id);
  }

  /**
   * Get a user record by ID, or undefined if not found.
   */
  getUser(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  /**
   * Update the heartbeat timestamp for a user.
   */
  heartbeat(id: string): void {
    const user = this.users.get(id);
    if (user) {
      user.lastHeartbeat = Date.now();
    }
  }

  /**
   * Check for stale users (no heartbeat within STALE_TIMEOUT_MS).
   * Marks stale users as 'offline' and returns their IDs.
   */
  checkStaleUsers(): string[] {
    const now = Date.now();
    const staleIds: string[] = [];

    for (const [id, user] of this.users) {
      if (user.status === 'online' && now - user.lastHeartbeat > STALE_TIMEOUT_MS) {
        user.status = 'offline';
        staleIds.push(id);
      }
    }

    return staleIds;
  }

  /**
   * Get user IDs within radius using geohash spatial index.
   * Queries 9 geohash cells (center + 8 neighbors) then filters by haversine distance.
   */
  getUsersInRadius(lat: number, lon: number, radiusKm: number, excludeId?: string): string[] {
    const cells = getGeohashCells(lat, lon);
    const origin = { lat, lon };
    const results: string[] = [];

    for (const cell of cells) {
      const userIds = this.geohashIndex.get(cell);
      if (!userIds) continue;

      for (const userId of userIds) {
        if (userId === excludeId) continue;
        const user = this.users.get(userId);
        if (!user || user.status !== 'online') continue;

        const distance = getDistanceKm(origin, { lat: user.lat, lon: user.lon });
        if (distance <= radiusKm) {
          results.push(userId);
        }
      }
    }

    return results;
  }

  /**
   * Get nearby users for a given origin user within radiusKm.
   * Returns NearbyUser[] sorted by distance ascending.
   */
  getNearbyUsers(originId: string, radiusKm: number): NearbyUser[] {
    const origin = this.users.get(originId);
    if (!origin) return [];

    const userIds = this.getUsersInRadius(origin.lat, origin.lon, radiusKm, originId);

    const results: Array<NearbyUser & { _dist: number }> = [];
    for (const id of userIds) {
      const user = this.users.get(id)!;
      const distance = getDistanceKm(
        { lat: origin.lat, lon: origin.lon },
        { lat: user.lat, lon: user.lon },
      );
      const rounded = Math.round(distance * 10) / 10;
      results.push({
        nickname: user.nickname,
        tag: user.tag,
        aiCli: user.aiCli as NearbyUser['aiCli'],
        distance: rounded,
        status: user.status,
        _dist: rounded,
      });
    }

    results.sort((a, b) => a._dist - b._dist);

    return results.map(({ _dist, ...rest }) => rest);
  }

  /**
   * Get all users currently online.
   */
  getAllOnlineUsers(): UserRecord[] {
    return Array.from(this.users.values()).filter((u) => u.status === 'online');
  }

  /**
   * Get total user count (all statuses).
   */
  getUserCount(): number {
    return this.users.size;
  }
}
