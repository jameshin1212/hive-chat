import { EventEmitter } from 'events';
import { SignalingClient } from './SignalingClient.js';
import { HyperswarmTransport } from './HyperswarmTransport.js';
import type { Identity, NearbyUser } from '@hivechat/shared';
import { P2P_CONNECT_TIMEOUT_MS } from '@hivechat/shared';

export class ConnectionManager extends EventEmitter {
  private signalingClient: SignalingClient;
  private p2pTransport: HyperswarmTransport;
  private activeTransport: 'relay' | 'direct' = 'relay';
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private currentSessionId: string | null = null;
  private currentPartner: { nickname: string; tag: string } | null = null;
  /** Guard to prevent concurrent cleanup races */
  private cleanupPromise: Promise<void> | null = null;

  constructor(identityOrClient: Identity | SignalingClient, serverUrlOrIdentity?: string | { nickname: string; tag: string }) {
    super();
    if (identityOrClient instanceof SignalingClient || (identityOrClient as any).connect) {
      // Test injection: ConnectionManager(signalingClient, identity)
      this.signalingClient = identityOrClient as unknown as SignalingClient;
      const ident = serverUrlOrIdentity as { nickname: string; tag: string };
      this.p2pTransport = new HyperswarmTransport(ident);
    } else {
      // Production: ConnectionManager(identity, serverUrl)
      const identity = identityOrClient as Identity;
      this.signalingClient = new SignalingClient(serverUrlOrIdentity as string, identity);
      this.p2pTransport = new HyperswarmTransport({ nickname: identity.nickname, tag: identity.tag });
    }
    this.setupSignalingEvents();
    this.setupP2PEvents();
  }

  get transportType(): 'relay' | 'direct' {
    return this.activeTransport;
  }

  // --- Proxy methods (delegate to SignalingClient) ---
  connect(): void {
    this.signalingClient.connect();
  }

  disconnect(): void {
    this.cleanupP2P();
    this.signalingClient.disconnect();
  }

  requestChat(targetNickname: string, targetTag: string): void {
    this.signalingClient.requestChat(targetNickname, targetTag);
  }

  acceptChat(sessionId: string): void {
    this.signalingClient.acceptChat(sessionId);
  }

  declineChat(sessionId: string): void {
    this.signalingClient.declineChat(sessionId);
  }

  /**
   * Send chat message — P2P only.
   * If P2P is not connected, message cannot be sent.
   */
  sendChatMessage(sessionId: string, content: string): void {
    if (this.activeTransport === 'direct' && this.p2pTransport.isConnected) {
      this.p2pTransport.send(content, Date.now());
    } else {
      // P2P not connected — emit error
      this.emit('chat_error', {
        error: 'P2P connection not established. Cannot send message.',
      });
    }
  }

  leaveChat(sessionId: string): void {
    this.cleanupP2P();
    this.signalingClient.leaveChat(sessionId);
  }

  requestNearbyUsers(radiusKm: number): void {
    this.signalingClient.requestNearbyUsers(radiusKm);
  }

  updateRadius(radiusKm: number): void {
    this.signalingClient.updateRadius(radiusKm);
  }

  requestFriendStatus(friends: Array<{ nickname: string; tag: string }>): void {
    this.signalingClient.requestFriendStatus(friends);
  }

  async destroy(): Promise<void> {
    this.cleanupP2P();
    await this.p2pTransport.destroy();
  }

  // --- Private ---

  private setupSignalingEvents(): void {
    // Forward signaling events to UI layer
    const forwardEvents = [
      'registered', 'nearby_users', 'user_joined', 'user_left', 'user_status',
      'chat_requested', 'chat_declined', 'chat_error',
      'friend_status_response', 'friend_status_update',
      'connected', 'reconnecting',
    ];
    for (const event of forwardEvents) {
      this.signalingClient.on(event, (...args: unknown[]) => {
        this.emit(event, ...args);
      });
    }

    // chat_accepted: start P2P connection (mandatory, not optional upgrade)
    this.signalingClient.on('chat_accepted', (data: { sessionId: string; partner: { nickname: string; tag: string } }) => {
      this.currentSessionId = data.sessionId;
      this.currentPartner = { nickname: data.partner.nickname, tag: data.partner.tag };
      this.emit('chat_accepted', data);
      // Start P2P connection (initiator side)
      this.connectP2P(data.sessionId, true);
    });

    // p2p_signal from server (acceptor side)
    this.signalingClient.on('p2p_signal', (data: { sessionId: string; topic: string }) => {
      if (!this.isConnecting) {
        this.currentSessionId = data.sessionId;
        this.connectP2P(data.sessionId, false);
      }
    });

    // Cleanup P2P on chat_left — only if it's for the CURRENT session
    this.signalingClient.on('chat_left', (data: any) => {
      if (data.sessionId && data.sessionId !== this.currentSessionId) return;
      if (this.isConnecting) return;
      this.cleanupP2P();
      this.emit('chat_left', data);
    });

    this.signalingClient.on('chat_user_offline', (data: any) => {
      if (this.isConnecting) return;
      this.cleanupP2P();
      this.emit('chat_user_offline', data);
    });

    // Ignore relay chat_msg from server (P2P only architecture)
    this.signalingClient.on('chat_msg', () => {
      // Intentionally ignored — messages only via P2P
    });
  }

  private setupP2PEvents(): void {
    // P2P status updates → forward to UI
    this.p2pTransport.on('status', (msg: string) => {
      this.emit('p2p_status_msg', msg);
    });

    // P2P connected: ready to chat
    this.p2pTransport.on('connected', (peerIdentity: { nickname: string; tag: string }) => {
      this.cancelConnectTimer();
      this.isConnecting = false;
      this.activeTransport = 'direct';
      this.currentPartner = peerIdentity;
      this.emit('transport_changed', 'direct');
      this.emit('p2p_connected', peerIdentity);

      if (this.currentSessionId) {
        this.signalingClient.sendP2PStatus(this.currentSessionId, 'direct');
      }
    });

    // P2P message → emit as chat_msg (same interface for TUI)
    this.p2pTransport.on('message', (data: { content: string; timestamp: number }) => {
      if (this.currentSessionId && this.currentPartner) {
        this.emit('chat_msg', {
          sessionId: this.currentSessionId,
          from: { nickname: this.currentPartner.nickname, tag: this.currentPartner.tag },
          content: data.content,
          timestamp: data.timestamp,
        });
      }
    });

    // P2P disconnected: notify server and emit event
    this.p2pTransport.on('disconnected', () => {
      if (this.activeTransport === 'direct') {
        // Notify server to clean up session
        if (this.currentSessionId) {
          this.signalingClient.leaveChat(this.currentSessionId);
        }
        this.emit('transport_changed', 'relay');
        this.cleanupP2P();
        this.emit('p2p_disconnected');
      }
    });
  }

  /**
   * Connect P2P — mandatory for chat. Not an "upgrade", it's the only way.
   */
  private async connectP2P(sessionId: string, isInitiator: boolean): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    // Set expected partner for P2P handshake identity verification
    if (this.currentPartner) {
      this.p2pTransport.setExpectedPartner(this.currentPartner);
    }
    this.emit('p2p_connecting');

    try {
      if (isInitiator) {
        // Step 1: Announce to DHT and wait for flushed
        await this.p2pTransport.announceAndWait(sessionId);
        // Step 2: AFTER announce complete, tell acceptor to start looking
        const topic = HyperswarmTransport.sessionToTopic(sessionId);
        const topicHex = HyperswarmTransport.topicToHex(topic);
        this.signalingClient.sendP2PSignal(sessionId, topicHex);
      } else {
        // Acceptor: initiator is already announced, connect to them
        await this.p2pTransport.connect(sessionId);
      }
    } catch {
      this.isConnecting = false;
      this.signalingClient.leaveChat(sessionId);
      this.cleanupP2P();
      this.emit('p2p_failed', { reason: 'Connection error' });
      return;
    }

    // Timeout: if P2P doesn't connect in time, fail
    this.connectTimer = setTimeout(() => {
      if (!this.p2pTransport.isConnected) {
        this.isConnecting = false;
        if (this.currentSessionId) {
          this.signalingClient.leaveChat(this.currentSessionId);
        }
        this.cleanupP2P();
        this.emit('p2p_failed', { reason: 'Connection timed out (45s). DHT bootstrap or NAT may be blocking.' });
      }
    }, P2P_CONNECT_TIMEOUT_MS);
  }

  private cancelConnectTimer(): void {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private cleanupP2P(): void {
    this.cancelConnectTimer();
    this.isConnecting = false;
    this.activeTransport = 'relay';
    this.currentSessionId = null;
    this.currentPartner = null;
    // Store cleanup promise so connectP2P can await it
    this.cleanupPromise = this.p2pTransport.cleanup().finally(() => {
      this.cleanupPromise = null;
    });
  }
}
