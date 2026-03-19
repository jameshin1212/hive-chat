import { useState, useEffect, useCallback } from 'react';
import type { NearbyUser } from '@cling-talk/shared';
import { RADIUS_OPTIONS, DEFAULT_RADIUS_KM } from '@cling-talk/shared';
import type { SignalingClient } from '../network/SignalingClient.js';

export function useNearbyUsers(client: SignalingClient | null) {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);

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

  const cycleRadius = useCallback(() => {
    setRadiusKm(current => {
      const currentIndex = RADIUS_OPTIONS.indexOf(current as typeof RADIUS_OPTIONS[number]);
      const nextIndex = (currentIndex + 1) % RADIUS_OPTIONS.length;
      const next = RADIUS_OPTIONS[nextIndex]!;
      if (client) {
        client.updateRadius(next);
      }
      return next;
    });
  }, [client]);

  const refreshUsers = useCallback(() => {
    if (client) {
      client.requestNearbyUsers(radiusKm);
    }
  }, [client, radiusKm]);

  return { users, radiusKm, cycleRadius, refreshUsers };
}
