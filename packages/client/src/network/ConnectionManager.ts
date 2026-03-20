import { EventEmitter } from 'events';
import type { SignalingClient } from './SignalingClient.js';
import { HyperswarmTransport } from './HyperswarmTransport.js';
import type { TransportType } from '@hivechat/shared';
import { P2P_CONNECT_TIMEOUT_MS } from '@hivechat/shared';

/**
 * ConnectionManager — P2P-only architecture.
 *
 * Server handles: discovery, presence, chat request/accept coordination, P2P signal exchange.
 * Messages: P2P (Hyperswarm) only. No server relay.
 *
 * Flow:
 * 1. chat_accepted → start P2P connection (15s timeout)
 * 2. P2P success → 'p2p_connected' event, messages flow directly
 * 3. P2P failure → 'p2p_failed' event, chat cannot proceed
 */
export class ConnectionManager extends EventEmitter {
  private signalingClient: SignalingClient;
  private p2pTransport: HyperswarmTransport;
  private activeTransport: TransportType = 'relay'; // 'relay' = not yet P2P connected
  private currentSessionId: string | null = null;
  private currentPartner: { nickname: string; tag: string } | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  constructor(signalingClient: SignalingClient, identity: { nickname: string; tag: string }) {
    super();
    this.signalingClient = signalingClient;
    this.p2pTransport = new HyperswarmTransport(identity);
    this.setupEventProxying();
    this.setupP2PEvents();
  }

  get transportType(): TransportType {
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

  private setupEventProxying(): void {
    // Proxy standard SignalingClient events (NO chat_msg — messages only via P2P)
    const proxyEvents = [
      'connected', 'reconnecting', 'nearby_users', 'user_joined', 'user_left',
      'user_status', 'error', 'chat_requested', 'chat_declined',
      'chat_error', 'friend_status_response', 'friend_status_update',
    ];

    for (const event of proxyEvents) {
      this.signalingClient.on(event, (...args: any[]) => {
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

    // Cleanup P2P on chat_left and chat_user_offline
    this.signalingClient.on('chat_left', (data: any) => {
      this.cleanupP2P();
      this.emit('chat_left', data);
    });

    this.signalingClient.on('chat_user_offline', (data: any) => {
      this.cleanupP2P();
      this.emit('chat_user_offline', data);
    });

    // Ignore relay chat_msg from server (P2P only architecture)
    this.signalingClient.on('chat_msg', () => {
      // Intentionally ignored — messages only via P2P
    });
  }

  private setupP2PEvents(): void {
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

    // P2P disconnected: chat ends (no fallback)
    this.p2pTransport.on('disconnected', () => {
      if (this.activeTransport === 'direct') {
        // Notify server to clean up session
        if (this.currentSessionId) {
          this.signalingClient.leaveChat(this.currentSessionId);
        }
        this.activeTransport = 'relay';
        this.emit('transport_changed', 'relay');
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
    this.emit('p2p_connecting');

    if (isInitiator) {
      const topic = HyperswarmTransport.sessionToTopic(sessionId);
      const topicHex = HyperswarmTransport.topicToHex(topic);
      this.signalingClient.sendP2PSignal(sessionId, topicHex);
    }

    try {
      await this.p2pTransport.connect(sessionId, isInitiator);
    } catch {
      this.isConnecting = false;
      // Notify server to clean up session
      this.signalingClient.leaveChat(sessionId);
      this.cleanupP2P();
      this.emit('p2p_failed', { reason: 'Connection error' });
      return;
    }

    // Timeout: if P2P doesn't connect in time, fail
    this.connectTimer = setTimeout(() => {
      if (!this.p2pTransport.isConnected) {
        this.isConnecting = false;
        // Notify server to clean up session
        if (this.currentSessionId) {
          this.signalingClient.leaveChat(this.currentSessionId);
        }
        this.p2pTransport.cleanup();
        this.cleanupP2P();
        this.emit('p2p_failed', { reason: 'Connection timed out (NAT/firewall may be blocking)' });
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
    this.p2pTransport.cleanup();
  }
}
