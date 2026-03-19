import type { WebSocket } from 'ws';

export interface UserRecord {
  nickname: string;
  tag: string;
  aiCli: string;
  lat: number;
  lon: number;
  ws: WebSocket;
  lastHeartbeat: number;
  status: 'online' | 'offline';
}

export interface GeoResult {
  lat: number;
  lon: number;
  city: string;
  country: string;
}
