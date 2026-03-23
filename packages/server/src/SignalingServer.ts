import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
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
import { lookupIp, normalizeIp, getDistanceKm } from './GeoLocationService.js';
import type { UserRecord } from './types.js';

/** Default Seoul coordinates for private IP fallback */
const DEFAULT_DEV_LAT = 37.5665;
const DEFAULT_DEV_LON = 126.9780;

/** Server broadcast radius - fixed at 10km per user decision */
const BROADCAST_RADIUS_KM = 10;

/** Rate limiter: max messages per second per connection */
const MAX_MESSAGES_PER_SECOND = 100;
/** Max connections per IP */
const MAX_CONNECTIONS_PER_IP = 10;
/** Max consecutive errors before disconnect */
const MAX_CONSECUTIVE_ERRORS = 5;
/** Max friends per subscription request */
const MAX_FRIENDS_PER_REQUEST = 100;

interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  clientIp?: string;
  /** Message rate limiting */
  msgCount: number;
  msgResetTime: number;
  /** Consecutive error counter */
  errorCount: number;
}

export class SignalingServer {
  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private presenceManager = new PresenceManager();
  private chatSessionManager = new ChatSessionManager();
  private friendSubscriptions = new Map<string, Array<{ nickname: string; tag: string }>>();
  private friendReverseIndex = new Map<string, Set<string>>();
  private subscriberTargets = new Map<string, Set<string>>();
  /** Track connection count per IP for DDoS protection */
  private ipConnectionCount = new Map<string, number>();
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Start the WebSocket server via HTTP upgrade (required for Fly.io proxy).
   * Returns the actual port (useful when port=0).
   */
  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Create HTTP server for Fly.io proxy compatibility
      this.httpServer = createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('HiveChat signaling server');
      });

      this.wss = new WebSocketServer({
        server: this.httpServer,
        maxPayload: 64 * 1024, // 64KB max message size
        perMessageDeflate: false, // Disable compression (compression bomb prevention)
      });

      this.httpServer.listen(this.port, '0.0.0.0', () => {
        const addr = this.httpServer!.address() as AddressInfo;
        this.port = addr.port;
        this.startHeartbeatCheck();
        resolve(this.port);
      });

      this.httpServer.on('error', reject);

      this.wss.on('connection', (ws: AliveWebSocket, req: IncomingMessage) => {
        ws.isAlive = true;
        ws.clientIp = normalizeIp(req.socket.remoteAddress ?? '127.0.0.1');
        ws.msgCount = 0;
        ws.msgResetTime = Date.now();
        ws.errorCount = 0;

        // Per-IP connection limit
        const ip = ws.clientIp;
        const count = (this.ipConnectionCount.get(ip) ?? 0) + 1;
        if (count > MAX_CONNECTIONS_PER_IP) {
          ws.close(1013, 'Too many connections from this IP');
          return;
        }
        this.ipConnectionCount.set(ip, count);

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('message', (data: Buffer) => {
          // Message rate limiting
          const now = Date.now();
          if (now - ws.msgResetTime > 1000) {
            ws.msgCount = 0;
            ws.msgResetTime = now;
          }
          ws.msgCount++;
          if (ws.msgCount > MAX_MESSAGES_PER_SECOND) {
            ws.close(1008, 'Rate limit exceeded');
            return;
          }
          this.handleMessage(ws, data);
        });

        ws.on('close', () => {
          // Decrement IP connection count
          if (ws.clientIp) {
            const remaining = (this.ipConnectionCount.get(ws.clientIp) ?? 1) - 1;
            if (remaining <= 0) this.ipConnectionCount.delete(ws.clientIp);
            else this.ipConnectionCount.set(ws.clientIp, remaining);
          }
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
      ws.errorCount++;
      if (ws.errorCount >= MAX_CONSECUTIVE_ERRORS) {
        ws.close(1008, 'Too many invalid messages');
        return;
      }
      this.send(ws, {
        type: MessageType.ERROR,
        code: 'INVALID_MESSAGE',
        message: 'Invalid JSON',
      });
      return;
    }

    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      ws.errorCount++;
      if (ws.errorCount >= MAX_CONSECUTIVE_ERRORS) {
        ws.close(1008, 'Too many invalid messages');
        return;
      }
      this.send(ws, {
        type: MessageType.ERROR,
        code: 'INVALID_MESSAGE',
        message: result.error.message,
      });
      return;
    }

    // Valid message resets error counter
    ws.errorCount = 0;

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
      case MessageType.CHAT_CANCEL:
        this.handleChatCancel(ws, msg.targetNickname, msg.targetTag);
        break;
      // CHAT_MESSAGE removed — P2P only architecture. Server does not relay messages.
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

    // Broadcast USER_JOINED to nearby clients with per-recipient distance
    const nearbyUserIds = this.presenceManager.getUsersInRadius(
      geo.lat, geo.lon, BROADCAST_RADIUS_KM, userId,
    );
    for (const nearbyId of nearbyUserIds) {
      const nearbyUser = this.presenceManager.getUser(nearbyId);
      if (!nearbyUser) continue;
      const dist = getDistanceKm(
        { lat: geo.lat, lon: geo.lon },
        { lat: nearbyUser.lat, lon: nearbyUser.lon },
      );
      const rounded = Math.round(dist * 10) / 10;
      this.sendToUser(nearbyId, {
        type: MessageType.USER_JOINED,
        user: {
          nickname: msg.nickname,
          tag: msg.tag,
          aiCli: msg.aiCli as NearbyUser['aiCli'],
          distance: rounded,
          status: 'online',
        },
      });
    }

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
    console.log(`[ChatRequest] ${ws.userId} → ${targetNickname}#${targetTag}`);
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
      console.log(`[ChatRequest] REJECTED: ${targetUserId} is busy`);
      this.send(ws, {
        type: MessageType.CHAT_ERROR,
        code: 'USER_BUSY',
        message: `User ${targetNickname}#${targetTag} is already in a chat`,
      });
      return;
    }

    if (this.chatSessionManager.isUserBusy(ws.userId!)) {
      console.log(`[ChatRequest] REJECTED: ${ws.userId} is busy (self)`);
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

  /**
   * Handle chat cancel — requester cancels their own pending request.
   * Removes pending request and notifies the target to dismiss the overlay.
   */
  private handleChatCancel(ws: AliveWebSocket, targetNickname: string, targetTag: string): void {
    const requesterId = ws.userId!;
    const targetId = `${targetNickname}#${targetTag}`;

    // Find and remove the pending request from this requester to the target
    const removed = this.chatSessionManager.removePendingByUser(requesterId);
    if (removed.length === 0) return;

    // Notify the target that the request was cancelled
    for (const sessionId of removed) {
      this.sendToUser(targetId, {
        type: MessageType.CHAT_CANCELLED,
        sessionId,
      });
    }
  }

  // handleChatMessage removed — P2P only architecture

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
    this.cleanReverseIndexForSubscriber(ws.userId);

    // Save coordinates before unregister removes the user from spatial index
    const userLat = user.lat;
    const userLon = user.lon;

    this.presenceManager.unregister(ws.userId);

    // Broadcast USER_LEFT to nearby users (10km radius)
    this.broadcastToNearby(
      {
        type: MessageType.USER_LEFT,
        nickname: user.nickname,
        tag: user.tag,
      },
      userLat,
      userLon,
      BROADCAST_RADIUS_KM,
      ws.userId,
    );
  }

  // --- P2P signal handlers ---

  private handleP2PSignal(ws: AliveWebSocket, sessionId: string, topic: string): void {
    console.log(`[P2P_SIGNAL] from=${ws.userId} session=${sessionId.slice(0, 8)}`);
    const session = this.chatSessionManager.getSessionByUser(ws.userId!);
    if (!session || session.id !== sessionId) {
      console.log(`[P2P_SIGNAL] DROPPED — no session found for ${ws.userId} (sessionId mismatch: got=${sessionId.slice(0, 8)} expected=${session?.id?.slice(0, 8) ?? 'none'})`);
      return;
    }

    const partnerId = session.userA === ws.userId ? session.userB : session.userA;
    const sent = this.sendToUser(partnerId, {
      type: MessageType.P2P_SIGNAL,
      sessionId,
      topic,
    });
    console.log(`[P2P_SIGNAL] relayed to=${partnerId} success=${sent}`);
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
    this.updateFriendReverseIndex(ws.userId!, friends);

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

  private updateFriendReverseIndex(subscriberId: string, friends: Array<{ nickname: string; tag: string }>): void {
    // Clean existing reverse index entries for this subscriber
    this.cleanReverseIndexForSubscriber(subscriberId);

    // Build new reverse index entries
    const targets = new Set<string>();
    for (const friend of friends) {
      const targetId = `${friend.nickname}#${friend.tag}`;
      targets.add(targetId);
      let subs = this.friendReverseIndex.get(targetId);
      if (!subs) {
        subs = new Set<string>();
        this.friendReverseIndex.set(targetId, subs);
      }
      subs.add(subscriberId);
    }
    this.subscriberTargets.set(subscriberId, targets);
  }

  private cleanReverseIndexForSubscriber(subscriberId: string): void {
    const targets = this.subscriberTargets.get(subscriberId);
    if (!targets) return;
    for (const targetId of targets) {
      const subs = this.friendReverseIndex.get(targetId);
      if (subs) {
        subs.delete(subscriberId);
        if (subs.size === 0) this.friendReverseIndex.delete(targetId);
      }
    }
    this.subscriberTargets.delete(subscriberId);
  }

  private notifyFriendSubscribers(userId: string, status: 'online' | 'offline'): void {
    const lastHash = userId.lastIndexOf('#');
    if (lastHash === -1) return;
    const nickname = userId.substring(0, lastHash);
    const tag = userId.substring(lastHash + 1);

    const subscribers = this.friendReverseIndex.get(userId);
    if (!subscribers) return;

    for (const subscriberId of subscribers) {
      if (subscriberId === userId) continue;
      this.sendToUser(subscriberId, {
        type: MessageType.FRIEND_STATUS_UPDATE,
        nickname,
        tag,
        status,
      });
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

      // Clean up stale pending requests (30s timeout)
      this.chatSessionManager.cleanupStalePending(30_000);

      // Check for stale users
      const staleIds = this.presenceManager.checkStaleUsers();
      for (const userId of staleIds) {
        const user = this.presenceManager.getUser(userId);
        if (user) {
          this.broadcastToNearby(
            {
              type: MessageType.USER_STATUS,
              nickname: user.nickname,
              tag: user.tag,
              status: 'offline',
            },
            user.lat,
            user.lon,
            BROADCAST_RADIUS_KM,
          );
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Broadcast a message to users within radius of origin coordinates.
   * Uses geohash spatial index via PresenceManager.getUsersInRadius().
   */
  private broadcastToNearby(
    message: ServerMessage,
    originLat: number,
    originLon: number,
    radiusKm: number,
    excludeUserId?: string,
  ): void {
    const nearbyUserIds = this.presenceManager.getUsersInRadius(
      originLat, originLon, radiusKm, excludeUserId,
    );
    for (const userId of nearbyUserIds) {
      this.sendToUser(userId, message);
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
        if (this.httpServer) {
          this.httpServer.close(() => {
            this.httpServer = null;
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }
}
