import { EventEmitter } from 'events';
import Hyperswarm from 'hyperswarm';
import crypto from 'hypercore-crypto';
import b4a from 'b4a';

export class HyperswarmTransport extends EventEmitter {
  private swarm: Hyperswarm | null = null;
  private connection: any | null = null; // Duplex stream
  private currentTopic: Buffer | null = null;
  private currentDiscovery: any | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private identity: { nickname: string; tag: string };
  private handshakeCompleted = false;
  private expectedSessionId: string | null = null;

  constructor(identity: { nickname: string; tag: string }) {
    super();
    this.identity = identity;
  }

  /** Convert sessionId to 32-byte topic buffer */
  static sessionToTopic(sessionId: string): Buffer {
    return crypto.data(b4a.from(sessionId));
  }

  /** Convert topic buffer to hex string (for protocol messages) */
  static topicToHex(topic: Buffer): string {
    return b4a.toString(topic, 'hex');
  }

  /**
   * Announce to DHT and wait for flushed.
   * Called by initiator BEFORE sending P2P_SIGNAL, so acceptor can find us.
   */
  async announceAndWait(sessionId: string): Promise<void> {
    await this.cleanup();
    if (this.swarm) {
      await this.swarm.destroy();
      this.swarm = null;
    }

    this.expectedSessionId = sessionId;
    this.handshakeCompleted = false;

    this.swarm = new Hyperswarm();
    this.swarm.on('connection', (conn: any, _peerInfo: any) => {
      this.emit('status', 'Peer discovered, verifying identity...');
      this.handleConnection(conn, _peerInfo);
    });

    const topic = HyperswarmTransport.sessionToTopic(sessionId);
    this.currentTopic = topic;
    this.emit('status', 'Registering on P2P network...');

    // Join as server+client, announce to DHT
    this.currentDiscovery = this.swarm.join(topic, { server: true, client: true });
    await this.currentDiscovery.flushed();
    this.emit('status', 'Waiting for peer to join...');

    // Start retry loop — re-lookup periodically in case acceptor joins later
    this.startRetryLoop();
  }

  /**
   * Connect to an existing topic (acceptor side).
   * Called by acceptor AFTER receiving P2P_SIGNAL — initiator is already announced.
   */
  async connect(sessionId: string): Promise<void> {
    await this.cleanup();
    if (this.swarm) {
      await this.swarm.destroy();
      this.swarm = null;
    }

    this.expectedSessionId = sessionId;
    this.handshakeCompleted = false;

    this.swarm = new Hyperswarm();
    this.swarm.on('connection', (conn: any, _peerInfo: any) => {
      this.emit('status', 'Peer discovered, verifying identity...');
      this.handleConnection(conn, _peerInfo);
    });

    const topic = HyperswarmTransport.sessionToTopic(sessionId);
    this.currentTopic = topic;
    this.emit('status', 'Searching for peer on P2P network...');

    // Join as server+client, lookup DHT for initiator
    this.currentDiscovery = this.swarm.join(topic, { server: true, client: true });
    await this.currentDiscovery.flushed();
    this.emit('status', 'Connecting to peer...');

    // Start retry loop — re-lookup periodically
    this.startRetryLoop();
  }

  /** Send a chat message over P2P */
  send(content: string, timestamp: number): void {
    if (!this.connection || !this.handshakeCompleted) return;
    const msg = JSON.stringify({ type: 'message', content, timestamp });
    this.connection.write(msg + '\n');
  }

  /** Clean up: leave topic, destroy connection, stop retries */
  async cleanup(): Promise<void> {
    this.stopRetryLoop();
    this.handshakeCompleted = false;
    this.expectedSessionId = null;
    this.currentDiscovery = null;

    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }

    if (this.currentTopic && this.swarm) {
      await this.swarm.leave(this.currentTopic);
      this.currentTopic = null;
    }
  }

  /** Full shutdown (app exit) */
  async destroy(): Promise<void> {
    await this.cleanup();
    if (this.swarm) {
      await this.swarm.destroy();
      this.swarm = null;
    }
  }

  get isConnected(): boolean {
    return this.handshakeCompleted && this.connection !== null;
  }

  private startRetryLoop(): void {
    this.stopRetryLoop();
    this.retryTimer = setInterval(async () => {
      if (this.handshakeCompleted || !this.swarm || !this.currentDiscovery) {
        this.stopRetryLoop();
        return;
      }
      this.emit('status', 'Still searching for peer...');
      try {
        await this.currentDiscovery.refresh({ client: true, server: true });
      } catch {
        // ignore refresh errors
      }
    }, 5_000);
  }

  private stopRetryLoop(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private handleConnection(conn: any, _peerInfo: any): void {
    // Prevent duplicate connections
    if (this.connection) {
      conn.destroy();
      return;
    }
    this.emit('status', 'Securing connection...');

    this.connection = conn;
    let buffer = '';

    conn.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          this.handleP2PMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      }
    });

    conn.on('close', () => {
      this.connection = null;
      if (this.handshakeCompleted) {
        this.handshakeCompleted = false;
        this.emit('disconnected');
      }
    });

    conn.on('error', () => {
      // Let close handler manage cleanup
    });

    // Send handshake
    const handshake = JSON.stringify({
      type: 'handshake',
      nickname: this.identity.nickname,
      tag: this.identity.tag,
      sessionId: this.expectedSessionId,
    });
    conn.write(handshake + '\n');
  }

  private handleP2PMessage(msg: any): void {
    if (msg.type === 'handshake') {
      // Verify session matches
      if (msg.sessionId !== this.expectedSessionId) {
        this.connection?.destroy();
        return;
      }
      this.handshakeCompleted = true;
      this.stopRetryLoop();
      this.emit('status', `Verified: ${msg.nickname}#${msg.tag}`);
      this.emit('connected', {
        nickname: msg.nickname,
        tag: msg.tag,
      });
    } else if (msg.type === 'message' && this.handshakeCompleted) {
      this.emit('message', {
        content: msg.content,
        timestamp: msg.timestamp,
      });
    }
  }
}
