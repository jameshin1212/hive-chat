import { useState, useEffect, useCallback } from 'react';
import type { ConnectionManager } from '../network/ConnectionManager.js';
import { getFriends } from '../friends/FriendManager.js';

export interface FriendStatus {
  nickname: string;
  tag: string;
  status: 'online' | 'offline' | 'unknown';
  aiCli?: string;
}

export function useFriends(
  client: ConnectionManager | null,
  connectionStatus: string,
) {
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [onlineFriendCount, setOnlineFriendCount] = useState(0);

  const refreshFriendStatuses = useCallback(() => {
    if (!client) return;
    const friends = getFriends();
    setFriendCount(friends.length);
    if (friends.length > 0) {
      client.requestFriendStatus(
        friends.map(f => ({ nickname: f.nickname, tag: f.tag })),
      );
    } else {
      setFriendStatuses([]);
      setOnlineFriendCount(0);
    }
  }, [client]);

  // Request friend statuses when connected
  useEffect(() => {
    if (connectionStatus === 'connected' && client) {
      refreshFriendStatuses();
    }
  }, [client, connectionStatus, refreshFriendStatuses]);

  // Subscribe to friend_status_response
  useEffect(() => {
    if (!client) return;

    const handleResponse = (data: { statuses: FriendStatus[] }) => {
      setFriendStatuses(data.statuses);
      setOnlineFriendCount(
        data.statuses.filter(s => s.status === 'online').length,
      );
    };

    client.on('friend_status_response', handleResponse);
    return () => {
      client.off('friend_status_response', handleResponse);
    };
  }, [client]);

  // Subscribe to friend_status_update
  useEffect(() => {
    if (!client) return;

    const handleUpdate = (data: {
      nickname: string;
      tag: string;
      status: 'online' | 'offline';
    }) => {
      setFriendStatuses(prev => {
        const updated = prev.map(f =>
          f.nickname === data.nickname && f.tag === data.tag
            ? { ...f, status: data.status as FriendStatus['status'] }
            : f,
        );
        setOnlineFriendCount(
          updated.filter(s => s.status === 'online').length,
        );
        return updated;
      });
    };

    client.on('friend_status_update', handleUpdate);
    return () => {
      client.off('friend_status_update', handleUpdate);
    };
  }, [client]);

  return { friendStatuses, friendCount, onlineFriendCount, refreshFriendStatuses };
}
