import { useState, useEffect, useCallback } from 'react';
import type { NearbyUser } from '@hivechat/shared';
import { DEFAULT_RADIUS_KM } from '@hivechat/shared';
import type { ConnectionManager } from '../network/ConnectionManager.js';

export function useNearbyUsers(client: ConnectionManager | null) {
  const [users, setUsers] = useState<NearbyUser[]>([]);

  useEffect(() => {
    if (!client) return;

    const handleNearbyUsers = (nearbyUsers: NearbyUser[]) => {
      setUsers(nearbyUsers);
    };

    const handleUserJoined = (user: NearbyUser) => {
      setUsers(prev => [...prev, user].sort((a, b) => a.distance - b.distance));
    };

    const handleUserLeft = (left: { nickname: string; tag: string }) => {
      setUsers(prev =>
        prev.filter(u => !(u.nickname === left.nickname && u.tag === left.tag)),
      );
    };

    const handleUserStatus = (s: { nickname: string; tag: string; status: 'online' | 'offline' }) => {
      setUsers(prev =>
        prev.map(u =>
          u.nickname === s.nickname && u.tag === s.tag
            ? { ...u, status: s.status }
            : u,
        ),
      );
    };

    client.on('nearby_users', handleNearbyUsers);
    client.on('user_joined', handleUserJoined);
    client.on('user_left', handleUserLeft);
    client.on('user_status', handleUserStatus);

    return () => {
      client.off('nearby_users', handleNearbyUsers);
      client.off('user_joined', handleUserJoined);
      client.off('user_left', handleUserLeft);
      client.off('user_status', handleUserStatus);
    };
  }, [client]);

  const refreshUsers = useCallback(() => {
    if (client) {
      client.requestNearbyUsers(DEFAULT_RADIUS_KM);
    }
  }, [client]);

  return { users, refreshUsers };
}
