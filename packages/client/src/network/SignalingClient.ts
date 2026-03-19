import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import {
  MessageType,
  PROTOCOL_VERSION,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
} from '@cling-talk/shared';
import type { Identity, ClientMessage, ServerMessage } from '@cling-talk/shared';

export class SignalingClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isIntentionalClose = false;

  constructor(
    private readonly serverUrl: string,
    private readonly identity: Identity,
  ) {
    super();
  }

  /**
   * Connect to the signaling server.
   */
  connect(): void {
    this.isIntentionalClose = false;
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      this.send({
        type: MessageType.REGISTER,
        nickname: this.identity.nickname,
        tag: this.identity.tag,
        aiCli: this.identity.aiCli,
        protocolVersion: PROTOCOL_VERSION,
      });
    });

    this.ws.on('message', (data: unknown) => {
      this.handleMessage(data);
    });

    this.ws.on('close', () => {
      this.stopHeartbeat();
      if (!this.isIntentionalClose) {
        this.emit('reconnecting');
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err: Error) => {
      // Let close handler manage reconnection
      console.error('[SignalingClient] WebSocket error:', err.message);
    });
  }

  /**
   * Disconnect from the server without reconnecting.
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Request nearby users list.
   */
  requestNearbyUsers(radiusKm: number): void {
    this.send({ type: MessageType.GET_NEARBY, radiusKm });
  }

  /**
   * Update discovery radius.
   */
  updateRadius(radiusKm: number): void {
    this.send({ type: MessageType.UPDATE_RADIUS, radiusKm });
  }

  /**
   * Request a chat session with a target user.
   */
  requestChat(targetNickname: string, targetTag: string): void {
    this.send({ type: MessageType.CHAT_REQUEST, targetNickname, targetTag });
  }

  /**
   * Accept an incoming chat request.
   */
  acceptChat(sessionId: string): void {
    this.send({ type: MessageType.CHAT_ACCEPT, sessionId });
  }

  /**
   * Decline an incoming chat request.
   */
  declineChat(sessionId: string): void {
    this.send({ type: MessageType.CHAT_DECLINE, sessionId });
  }

  /**
   * Send a chat message in an active session.
   */
  sendChatMessage(sessionId: string, content: string): void {
    this.send({ type: MessageType.CHAT_MESSAGE, sessionId, content });
  }

  /**
   * Leave an active chat session.
   */
  leaveChat(sessionId: string): void {
    this.send({ type: MessageType.CHAT_LEAVE, sessionId });
  }

  /**
   * Request status of friends from the server.
   */
  requestFriendStatus(friends: Array<{ nickname: string; tag: string }>): void {
    this.send({ type: MessageType.FRIEND_STATUS_REQUEST, friends });
  }

  private handleMessage(data: unknown): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(data)) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case MessageType.REGISTERED:
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        this.emit('connected');
        this.emit('nearby_users', msg.users);
        break;
      case MessageType.NEARBY_USERS:
        this.emit('nearby_users', msg.users);
        break;
      case MessageType.USER_JOINED:
        this.emit('user_joined', msg.user);
        break;
      case MessageType.USER_LEFT:
        this.emit('user_left', { nickname: msg.nickname, tag: msg.tag });
        break;
      case MessageType.USER_STATUS:
        this.emit('user_status', { nickname: msg.nickname, tag: msg.tag, status: msg.status });
        break;
      case MessageType.ERROR:
        this.emit('error', { code: msg.code, message: msg.message });
        break;
      case MessageType.CHAT_REQUESTED:
        this.emit('chat_requested', { sessionId: msg.sessionId, from: msg.from });
        break;
      case MessageType.CHAT_ACCEPTED:
        this.emit('chat_accepted', { sessionId: msg.sessionId, partner: msg.partner });
        break;
      case MessageType.CHAT_DECLINED:
        this.emit('chat_declined', { sessionId: msg.sessionId });
        break;
      case MessageType.CHAT_MSG:
        this.emit('chat_msg', { sessionId: msg.sessionId, from: msg.from, content: msg.content, timestamp: msg.timestamp });
        break;
      case MessageType.CHAT_LEFT:
        this.emit('chat_left', { sessionId: msg.sessionId, nickname: msg.nickname, tag: msg.tag });
        break;
      case MessageType.CHAT_USER_OFFLINE:
        this.emit('chat_user_offline', { nickname: msg.nickname, tag: msg.tag });
        break;
      case MessageType.CHAT_ERROR:
        this.emit('chat_error', { code: msg.code, message: msg.message });
        break;
      case MessageType.FRIEND_STATUS_RESPONSE:
        this.emit('friend_status_response', { statuses: msg.statuses });
        break;
      case MessageType.FRIEND_STATUS_UPDATE:
        this.emit('friend_status_update', { nickname: msg.nickname, tag: msg.tag, status: msg.status });
        break;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: MessageType.HEARTBEAT });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Calculate reconnect delay with exponential backoff + jitter.
   * base = RECONNECT_BASE_DELAY_MS * 2^attempt, capped at RECONNECT_MAX_DELAY_MS
   * jitter = 0.5 + Math.random() (0.5x to 1.5x)
   */
  private getReconnectDelay(attempt: number): number {
    const base = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt);
    const capped = Math.min(base, RECONNECT_MAX_DELAY_MS);
    const jitter = 0.5 + Math.random();
    return Math.floor(capped * jitter);
  }

  private scheduleReconnect(): void {
    const delay = this.getReconnectDelay(this.reconnectAttempt);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
