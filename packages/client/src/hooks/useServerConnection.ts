import { useState, useEffect, useRef } from 'react';
import type { Identity } from '@cling-talk/shared';
import { DEFAULT_SERVER_URL } from '@cling-talk/shared';
import { SignalingClient } from '../network/SignalingClient.js';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export function useServerConnection(identity: Identity) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const clientRef = useRef<SignalingClient | null>(null);

  useEffect(() => {
    const serverUrl = process.env['CLING_TALK_SERVER'] || DEFAULT_SERVER_URL;
    const client = new SignalingClient(serverUrl, identity);
    clientRef.current = client;

    client.on('connected', () => setStatus('connected'));
    client.on('reconnecting', () => setStatus('reconnecting'));
    client.on('disconnected', () => setStatus('offline'));

    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [identity]);

  return { status, client: clientRef.current };
}
