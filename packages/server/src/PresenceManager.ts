import { STALE_TIMEOUT_MS } from '@cling-talk/shared';
import type { NearbyUser } from '@cling-talk/shared';
import type { UserRecord } from './types.js';
import { findNearbyUsers } from './GeoLocationService.js';

export class PresenceManager {
  private users = new Map<string, UserRecord>();

  /**
   * Register a user. If a user with the same ID already exists,
   * terminate the old WebSocket and replace with the new record.
   */
  register(id: string, record: UserRecord): void {
    const existing = this.users.get(id);
    if (existing) {
      existing.ws.terminate();
    }
    this.users.set(id, record);
  }

  /**
   * Remove a user from the registry.
   */
  unregister(id: string): void {
    this.users.delete(id);
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
   * Get nearby users for a given origin user within radiusKm.
   * Returns NearbyUser[] sorted by distance ascending.
   */
  getNearbyUsers(originId: string, radiusKm: number): NearbyUser[] {
    const origin = this.users.get(originId);
    if (!origin) return [];

    const nearby = findNearbyUsers(
      { lat: origin.lat, lon: origin.lon },
      this.users,
      radiusKm,
      originId,
    );

    return nearby.map(({ id, distance }) => {
      const user = this.users.get(id)!;
      return {
        nickname: user.nickname,
        tag: user.tag,
        aiCli: user.aiCli as NearbyUser['aiCli'],
        distance,
        status: user.status,
      };
    });
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
