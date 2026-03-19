import { EventEmitter } from 'events';
import type { SignalingClient } from './SignalingClient.js';
import { HyperswarmTransport } from './HyperswarmTransport.js';
import type { TransportType } from '@cling-talk/shared';
import { P2P_UPGRADE_TIMEOUT_MS } from '@cling-talk/shared';

export class ConnectionManager extends EventEmitter {
  private signalingClient: SignalingClient;
  private p2pTransport: HyperswarmTransport;
  private activeTransport: TransportType = 'relay';
  private currentSessionId: string | null = null;
  private currentPartner: { nickname: string; tag: string } | null = null;
  private upgradeTimer: ReturnType<typeof setTimeout> | null = null;
  private isUpgrading = false;

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

  sendChatMessage(sessionId: string, content: string): void {
    if (this.activeTransport === 'direct' && this.p2pTransport.isConnected) {
      this.p2pTransport.send(content, Date.now());
    } else {
      this.signalingClient.sendChatMessage(sessionId, content);
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
    // Proxy standard SignalingClient events
    const proxyEvents = [
      'connected', 'reconnecting', 'nearby_users', 'user_joined', 'user_left',
      'user_status', 'error', 'chat_requested', 'chat_declined', 'chat_msg',
      'chat_error', 'friend_status_response', 'friend_status_update',
    ];

    for (const event of proxyEvents) {
      this.signalingClient.on(event, (...args: any[]) => {
        this.emit(event, ...args);
      });
    }

    // Special handling for chat_accepted: proxy AND trigger P2P upgrade
    this.signalingClient.on('chat_accepted', (data: { sessionId: string; partner: { nickname: string; tag: string } }) => {
      this.currentSessionId = data.sessionId;
      this.currentPartner = { nickname: data.partner.nickname, tag: data.partner.tag };
      this.emit('chat_accepted', data);
      // Initiator side: attempt P2P upgrade
      this.attemptP2PUpgrade(data.sessionId, true);
    });

    // Listen for p2p_signal from server (acceptor side)
    this.signalingClient.on('p2p_signal', (data: { sessionId: string; topic: string }) => {
      if (!this.isUpgrading) {
        this.currentSessionId = data.sessionId;
        this.attemptP2PUpgrade(data.sessionId, false);
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
  }

  private setupP2PEvents(): void {
    // P2P connected: switch to direct transport
    this.p2pTransport.on('connected', (peerIdentity: { nickname: string; tag: string }) => {
      this.cancelUpgradeTimer();
      this.isUpgrading = false;
      this.activeTransport = 'direct';
      this.currentPartner = peerIdentity;
      this.emit('transport_changed', 'direct');

      // Notify server of transport change
      if (this.currentSessionId) {
        this.signalingClient.sendP2PStatus(this.currentSessionId, 'direct');
      }
    });

    // P2P message: convert to chat_msg event (same shape as relay)
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

    // P2P disconnected: downgrade to relay
    this.p2pTransport.on('disconnected', () => {
      if (this.activeTransport === 'direct') {
        this.activeTransport = 'relay';
        this.emit('transport_changed', 'relay');

        // Notify server of transport change
        if (this.currentSessionId) {
          this.signalingClient.sendP2PStatus(this.currentSessionId, 'relay');
        }
      }
    });
  }

  private async attemptP2PUpgrade(sessionId: string, isInitiator: boolean): Promise<void> {
    if (this.isUpgrading) return;
    this.isUpgrading = true;

    if (isInitiator) {
      const topic = HyperswarmTransport.sessionToTopic(sessionId);
      const topicHex = HyperswarmTransport.topicToHex(topic);
      // Send P2P signal to partner via server
      this.signalingClient.sendP2PSignal(sessionId, topicHex);
    }

    try {
      await this.p2pTransport.connect(sessionId, isInitiator);
    } catch {
      this.isUpgrading = false;
      return;
    }

    // Set timeout for P2P upgrade
    this.upgradeTimer = setTimeout(() => {
      if (!this.p2pTransport.isConnected) {
        this.cancelP2PUpgrade();
      }
    }, P2P_UPGRADE_TIMEOUT_MS);
  }

  private cancelP2PUpgrade(): void {
    this.cancelUpgradeTimer();
    this.isUpgrading = false;
    this.p2pTransport.cleanup();
  }

  private cancelUpgradeTimer(): void {
    if (this.upgradeTimer) {
      clearTimeout(this.upgradeTimer);
      this.upgradeTimer = null;
    }
  }

  private cleanupP2P(): void {
    this.cancelUpgradeTimer();
    this.isUpgrading = false;
    this.activeTransport = 'relay';
    this.currentSessionId = null;
    this.currentPartner = null;
    this.p2pTransport.cleanup();
  }
}
