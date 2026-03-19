import { useState, useEffect, useRef } from 'react';
import type { Identity, TransportType } from '@cling-talk/shared';
import { DEFAULT_SERVER_URL } from '@cling-talk/shared';
import { SignalingClient } from '../network/SignalingClient.js';
import { ConnectionManager } from '../network/ConnectionManager.js';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export function useServerConnection(identity: Identity) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [transportType, setTransportType] = useState<TransportType>('relay');
  const clientRef = useRef<ConnectionManager | null>(null);

  useEffect(() => {
    const serverUrl = process.env['CLING_TALK_SERVER'] || DEFAULT_SERVER_URL;
    const signalingClient = new SignalingClient(serverUrl, identity);
    const connectionManager = new ConnectionManager(signalingClient, {
      nickname: identity.nickname,
      tag: identity.tag,
    });
    clientRef.current = connectionManager;

    connectionManager.on('connected', () => setStatus('connected'));
    connectionManager.on('reconnecting', () => setStatus('reconnecting'));
    connectionManager.on('disconnected', () => setStatus('offline'));
    connectionManager.on('transport_changed', (type: TransportType) => {
      setTransportType(type);
    });

    connectionManager.connect();

    return () => {
      connectionManager.destroy().catch(() => {});
      clientRef.current = null;
    };
  }, [identity]);

  return { status, client: clientRef.current, transportType };
}
