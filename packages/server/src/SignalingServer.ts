import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  clientMessageSchema,
  MessageType,
  HEARTBEAT_INTERVAL_MS,
  DEFAULT_RADIUS_KM,
} from '@hivechat/shared';
import type { ServerMessage, NearbyUser } from '@hivechat/shared';
import { PresenceManager } from './PresenceManager.js';
import { ChatSessionManager } from './ChatSessionManager.js';
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
  private chatSessionManager = new ChatSessionManager();
  private friendSubscriptions = new Map<string, Array<{ nickname: string; tag: string }>>();
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Start the WebSocket server. Returns the actual port (useful when port=0).
   */
  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: '0.0.0.0' });

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
      case MessageType.CHAT_REQUEST:
        this.handleChatRequest(ws, msg.targetNickname, msg.targetTag);
        break;
      case MessageType.CHAT_ACCEPT:
        this.handleChatAccept(ws, msg.sessionId);
        break;
      case MessageType.CHAT_DECLINE:
        this.handleChatDecline(ws, msg.sessionId);
        break;
      case MessageType.CHAT_MESSAGE:
        this.handleChatMessage(ws, msg.sessionId, msg.content);
        break;
      case MessageType.CHAT_LEAVE:
        this.handleChatLeave(ws, msg.sessionId);
        break;
      case MessageType.FRIEND_STATUS_REQUEST:
        this.handleFriendStatusRequest(ws, msg.friends);
        break;
      case MessageType.P2P_SIGNAL:
        this.handleP2PSignal(ws, msg.sessionId, msg.topic);
        break;
      case MessageType.P2P_STATUS:
        this.handleP2PStatus(ws, msg.sessionId, msg.transportType);
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

    // Notify friend subscribers that this user came online
    this.notifyFriendSubscribers(userId, 'online');
  }

  private handleGetNearby(ws: AliveWebSocket, radiusKm: number): void {
    const users = this.presenceManager.getNearbyUsers(ws.userId!, radiusKm);
    this.send(ws, {
      type: MessageType.NEARBY_USERS,
      users,
    });
  }

  // --- Chat relay handlers ---

  private sendToUser(targetUserId: string, message: ServerMessage): boolean {
    const user = this.presenceManager.getUser(targetUserId);
    if (!user || user.ws.readyState !== WebSocket.OPEN) return false;
    this.send(user.ws, message);
    return true;
  }

  private handleChatRequest(ws: AliveWebSocket, targetNickname: string, targetTag: string): void {
    const targetUserId = `${targetNickname}#${targetTag}`;
    const targetUser = this.presenceManager.getUser(targetUserId);

    if (!targetUser || targetUser.status !== 'online') {
      this.send(ws, {
        type: MessageType.CHAT_ERROR,
        code: 'USER_OFFLINE',
        message: `User ${targetNickname}#${targetTag} is not online`,
      });
      return;
    }

    if (this.chatSessionManager.isUserBusy(targetUserId)) {
      this.send(ws, {
        type: MessageType.CHAT_ERROR,
        code: 'USER_BUSY',
        message: `User ${targetNickname}#${targetTag} is already in a chat`,
      });
      return;
    }

    if (this.chatSessionManager.isUserBusy(ws.userId!)) {
      this.send(ws, {
        type: MessageType.CHAT_ERROR,
        code: 'USER_BUSY',
        message: 'You are already in a chat',
      });
      return;
    }

    const sessionId = this.chatSessionManager.createPendingRequest(ws.userId!, targetUserId);
    if (!sessionId) {
      this.send(ws, {
        type: MessageType.CHAT_ERROR,
        code: 'USER_BUSY',
        message: 'Unable to create chat request',
      });
      return;
    }

    const requesterUser = this.presenceManager.getUser(ws.userId!);
    if (!requesterUser) return;

    const fromUser: NearbyUser = {
      nickname: requesterUser.nickname,
      tag: requesterUser.tag,
      aiCli: requesterUser.aiCli as NearbyUser['aiCli'],
      distance: 0,
      status: 'online',
    };

    this.sendToUser(targetUserId, {
      type: MessageType.CHAT_REQUESTED,
      sessionId,
      from: fromUser,
    });
  }

  private handleChatAccept(ws: AliveWebSocket, sessionId: string): void {
    const pending = this.chatSessionManager.getPendingRequest(sessionId);
    if (!pending) return;

    const session = this.chatSessionManager.acceptRequest(sessionId);
    if (!session) return;

    const accepterUser = this.presenceManager.getUser(ws.userId!);
    if (!accepterUser) return;

    const partnerInfo: NearbyUser = {
      nickname: accepterUser.nickname,
      tag: accepterUser.tag,
      aiCli: accepterUser.aiCli as NearbyUser['aiCli'],
      distance: 0,
      status: 'online',
    };

    this.sendToUser(pending.from, {
      type: MessageType.CHAT_ACCEPTED,
      sessionId,
      partner: partnerInfo,
    });
  }

  private handleChatDecline(ws: AliveWebSocket, sessionId: string): void {
    const pending = this.chatSessionManager.getPendingRequest(sessionId);
    if (!pending) return;

    this.chatSessionManager.declineRequest(sessionId);

    this.sendToUser(pending.from, {
      type: MessageType.CHAT_DECLINED,
      sessionId,
    });
  }

  private handleChatMessage(ws: AliveWebSocket, sessionId: string, content: string): void {
    const session = this.chatSessionManager.getSessionByUser(ws.userId!);
    if (!session || session.id !== sessionId) return;

    const partnerId = session.userA === ws.userId ? session.userB : session.userA;
    const senderUser = this.presenceManager.getUser(ws.userId!);
    if (!senderUser) return;

    this.sendToUser(partnerId, {
      type: MessageType.CHAT_MSG,
      sessionId,
      from: { nickname: senderUser.nickname, tag: senderUser.tag },
      content,
      timestamp: Date.now(),
    });
  }

  private handleChatLeave(ws: AliveWebSocket, sessionId: string): void {
    const session = this.chatSessionManager.getSessionByUser(ws.userId!);
    if (!session || session.id !== sessionId) return;

    const partnerId = session.userA === ws.userId ? session.userB : session.userA;
    const senderUser = this.presenceManager.getUser(ws.userId!);
    if (!senderUser) return;

    this.chatSessionManager.removeSession(sessionId);

    this.sendToUser(partnerId, {
      type: MessageType.CHAT_LEFT,
      sessionId,
      nickname: senderUser.nickname,
      tag: senderUser.tag,
    });
  }

  private handleClose(ws: AliveWebSocket): void {
    if (!ws.userId) return;

    const user = this.presenceManager.getUser(ws.userId);
    if (!user) return;

    // Clean up active chat session
    const chatSession = this.chatSessionManager.getSessionByUser(ws.userId);
    if (chatSession) {
      const partnerId = chatSession.userA === ws.userId ? chatSession.userB : chatSession.userA;
      this.sendToUser(partnerId, {
        type: MessageType.CHAT_USER_OFFLINE,
        nickname: user.nickname,
        tag: user.tag,
      });
      this.chatSessionManager.removeSession(chatSession.id);
    }

    // Clean up pending requests
    this.chatSessionManager.removePendingByUser(ws.userId);

    // Notify friend subscribers that this user went offline
    this.notifyFriendSubscribers(ws.userId, 'offline');

    // Clean up this user's own friend subscriptions
    this.friendSubscriptions.delete(ws.userId);

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

  // --- P2P signal handlers ---

  private handleP2PSignal(ws: AliveWebSocket, sessionId: string, topic: string): void {
    const session = this.chatSessionManager.getSessionByUser(ws.userId!);
    if (!session || session.id !== sessionId) return;

    const partnerId = session.userA === ws.userId ? session.userB : session.userA;
    this.sendToUser(partnerId, {
      type: MessageType.P2P_SIGNAL,
      sessionId,
      topic,
    });
  }

  private handleP2PStatus(ws: AliveWebSocket, sessionId: string, transportType: 'relay' | 'direct'): void {
    const session = this.chatSessionManager.getSessionByUser(ws.userId!);
    if (!session || session.id !== sessionId) return;

    this.chatSessionManager.updateTransport(sessionId, transportType);
  }

  // --- Friend status handlers ---

  private handleFriendStatusRequest(
    ws: AliveWebSocket,
    friends: Array<{ nickname: string; tag: string }>,
  ): void {
    // Store subscription for push updates
    this.friendSubscriptions.set(ws.userId!, friends);

    // Build current status for each requested friend
    const statuses = friends.map((f) => {
      const friendUserId = `${f.nickname}#${f.tag}`;
      const user = this.presenceManager.getUser(friendUserId);
      return {
        nickname: f.nickname,
        tag: f.tag,
        status: user ? (user.status as 'online' | 'offline') : ('unknown' as const),
        ...(user?.aiCli ? { aiCli: user.aiCli as NearbyUser['aiCli'] } : {}),
      };
    });

    this.send(ws, {
      type: MessageType.FRIEND_STATUS_RESPONSE,
      statuses,
    });
  }

  private notifyFriendSubscribers(userId: string, status: 'online' | 'offline'): void {
    // Parse userId into nickname and tag (last # is separator)
    const lastHash = userId.lastIndexOf('#');
    if (lastHash === -1) return;
    const nickname = userId.substring(0, lastHash);
    const tag = userId.substring(lastHash + 1);

    for (const [subscriberId, friends] of this.friendSubscriptions) {
      if (subscriberId === userId) continue;
      const match = friends.some((f) => f.nickname === nickname && f.tag === tag);
      if (match) {
        this.sendToUser(subscriberId, {
          type: MessageType.FRIEND_STATUS_UPDATE,
          nickname,
          tag,
          status,
        });
      }
    }
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
