import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  clientMessageSchema,
  MessageType,
  HEARTBEAT_INTERVAL_MS,
  DEFAULT_RADIUS_KM,
} from '@cling-talk/shared';
import type { ServerMessage, NearbyUser } from '@cling-talk/shared';
import { PresenceManager } from './PresenceManager.js';
import { lookupIp, normalizeIp } from './GeoLocationService.js';
import type { UserRecord } from './types.js';

/** Default Seoul coordinates for private IP fallback */
const DEFAULT_DEV_LAT = 37.5665;
const DEFAULT_DEV_LON = 126.9780;

interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  clientIp?: string;
}

export class SignalingServer {
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private presenceManager = new PresenceManager();
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Start the WebSocket server. Returns the actual port (useful when port=0).
   */
  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', () => {
        const addr = this.wss!.address() as AddressInfo;
        this.port = addr.port;
        this.startHeartbeatCheck();
        resolve(this.port);
      });

      this.wss.on('error', reject);

      this.wss.on('connection', (ws: AliveWebSocket, req: IncomingMessage) => {
        ws.isAlive = true;
        ws.clientIp = normalizeIp(req.socket.remoteAddress ?? '127.0.0.1');

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('message', (data: Buffer) => {
          this.handleMessage(ws, data);
        });

        ws.on('close', () => {
          this.handleClose(ws);
        });

        ws.on('error', (err: Error) => {
          console.error(`[SignalingServer] WebSocket error for ${ws.userId ?? 'unknown'}:`, err.message);
        });
      });
    });
  }

  private handleMessage(ws: AliveWebSocket, data: Buffer): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      this.send(ws, {
        type: MessageType.ERROR,
        code: 'INVALID_MESSAGE',
        message: 'Invalid JSON',
      });
      return;
    }

    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      this.send(ws, {
        type: MessageType.ERROR,
        code: 'INVALID_MESSAGE',
        message: result.error.message,
      });
      return;
    }

    const msg = result.data;

    // Ignore non-REGISTER messages from unregistered connections
    if (msg.type !== MessageType.REGISTER && !ws.userId) {
      return;
    }

    switch (msg.type) {
      case MessageType.REGISTER:
        this.handleRegister(ws, msg);
        break;
      case MessageType.HEARTBEAT:
        this.presenceManager.heartbeat(ws.userId!);
        break;
      case MessageType.GET_NEARBY:
        this.handleGetNearby(ws, msg.radiusKm);
        break;
      case MessageType.UPDATE_RADIUS:
        this.handleGetNearby(ws, msg.radiusKm);
        break;
    }
  }

  private handleRegister(
    ws: AliveWebSocket,
    msg: { nickname: string; tag: string; aiCli: string; protocolVersion: number },
  ): void {
    const userId = `${msg.nickname}#${msg.tag}`;

    let geo = lookupIp(ws.clientIp!);
    if (!geo) {
      // Fallback to default dev coordinates for private IPs
      geo = {
        lat: DEFAULT_DEV_LAT,
        lon: DEFAULT_DEV_LON,
        city: 'Dev',
        country: 'Dev',
      };
    }

    const record: UserRecord = {
      nickname: msg.nickname,
      tag: msg.tag,
      aiCli: msg.aiCli,
      lat: geo.lat,
      lon: geo.lon,
      ws: ws as WebSocket,
      lastHeartbeat: Date.now(),
      status: 'online',
    };

    ws.userId = userId;
    this.presenceManager.register(userId, record);

    const nearbyUsers = this.presenceManager.getNearbyUsers(userId, DEFAULT_RADIUS_KM);

    this.send(ws, {
      type: MessageType.REGISTERED,
      users: nearbyUsers,
    });

    // Broadcast USER_JOINED to nearby clients
    this.broadcastToRegistered(
      {
        type: MessageType.USER_JOINED,
        user: {
          nickname: msg.nickname,
          tag: msg.tag,
          aiCli: msg.aiCli as NearbyUser['aiCli'],
          distance: 0,
          status: 'online',
        },
      },
      userId,
    );
  }

  private handleGetNearby(ws: AliveWebSocket, radiusKm: number): void {
    const users = this.presenceManager.getNearbyUsers(ws.userId!, radiusKm);
    this.send(ws, {
      type: MessageType.NEARBY_USERS,
      users,
    });
  }

  private handleClose(ws: AliveWebSocket): void {
    if (!ws.userId) return;

    const user = this.presenceManager.getUser(ws.userId);
    if (!user) return;

    this.presenceManager.unregister(ws.userId);

    this.broadcastToRegistered(
      {
        type: MessageType.USER_LEFT,
        nickname: user.nickname,
        tag: user.tag,
      },
      ws.userId,
    );
  }

  private startHeartbeatCheck(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      for (const client of this.wss.clients) {
        const ws = client as AliveWebSocket;
        if (!ws.isAlive) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }

      // Check for stale users
      const staleIds = this.presenceManager.checkStaleUsers();
      for (const userId of staleIds) {
        const user = this.presenceManager.getUser(userId);
        if (user) {
          this.broadcastToRegistered(
            {
              type: MessageType.USER_STATUS,
              nickname: user.nickname,
              tag: user.tag,
              status: 'offline',
            },
            undefined,
          );
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Broadcast a message to all registered clients, optionally excluding one.
   */
  private broadcastToRegistered(message: ServerMessage, excludeUserId?: string): void {
    if (!this.wss) return;

    for (const client of this.wss.clients) {
      const ws = client as AliveWebSocket;
      if (ws.readyState === WebSocket.OPEN && ws.userId && ws.userId !== excludeUserId) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Send a message to a single client.
   */
  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Gracefully stop the server.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (!this.wss) {
        resolve();
        return;
      }

      for (const client of this.wss.clients) {
        client.terminate();
      }

      this.wss.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }
}
