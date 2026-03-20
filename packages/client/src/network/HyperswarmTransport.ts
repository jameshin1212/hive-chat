import { EventEmitter } from 'events';
import Hyperswarm from 'hyperswarm';
import crypto from 'hypercore-crypto';
import b4a from 'b4a';

export class HyperswarmTransport extends EventEmitter {
  private swarm: Hyperswarm | null = null;
  private connection: any | null = null; // Duplex stream
  private currentTopic: Buffer | null = null;
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
   * Attempt P2P connection for a given session.
   * Joins the topic (server or client mode based on role),
   * waits for connection, performs handshake, and emits 'connected' on success.
   */
  async connect(sessionId: string, isInitiator: boolean): Promise<void> {
    // Always create a fresh swarm for each chat session
    // Reusing a swarm after failed connections causes stale internal state
    await this.cleanup();
    if (this.swarm) {
      await this.swarm.destroy();
      this.swarm = null;
    }

    this.expectedSessionId = sessionId;
    this.handshakeCompleted = false;

    this.swarm = new Hyperswarm();
    this.swarm.on('connection', (conn: any, peerInfo: any) => {
      this.handleConnection(conn, peerInfo);
    });

    const topic = HyperswarmTransport.sessionToTopic(sessionId);
    this.currentTopic = topic;

    // Initiator as client only, acceptor as server only
    // Prevents duplicate connections
    this.swarm.join(topic, {
      server: !isInitiator,
      client: isInitiator,
    });

    // Flush to speed up discovery
    if (isInitiator) {
      await this.swarm.flush();
    }
  }

  /** Send a chat message over P2P */
  send(content: string, timestamp: number): void {
    if (!this.connection || !this.handshakeCompleted) return;
    const msg = JSON.stringify({ type: 'message', content, timestamp });
    this.connection.write(msg + '\n');
  }

  /** Clean up: leave topic, destroy connection */
  async cleanup(): Promise<void> {
    this.handshakeCompleted = false;
    this.expectedSessionId = null;

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

  private handleConnection(conn: any, _peerInfo: any): void {
    // Prevent duplicate connections
    if (this.connection) {
      conn.destroy();
      return;
    }

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
