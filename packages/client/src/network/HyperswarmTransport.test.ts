import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock discovery object returned by swarm.join()
const mockDiscovery = {
  flushed: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
};

// Mock Hyperswarm before importing the module
const mockSwarm = new EventEmitter() as EventEmitter & {
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};
mockSwarm.join = vi.fn().mockReturnValue(mockDiscovery);
mockSwarm.leave = vi.fn().mockResolvedValue(undefined);
mockSwarm.flush = vi.fn().mockResolvedValue(undefined);
mockSwarm.destroy = vi.fn().mockResolvedValue(undefined);

vi.mock('hyperswarm', () => ({
  default: vi.fn(() => mockSwarm),
}));

vi.mock('hypercore-crypto', () => ({
  default: {
    data: (buf: Buffer) => {
      // Deterministic 32-byte hash mock
      const hash = Buffer.alloc(32);
      buf.copy(hash, 0, 0, Math.min(buf.length, 32));
      return hash;
    },
  },
}));

vi.mock('b4a', () => ({
  default: {
    from: (str: string) => Buffer.from(str),
    toString: (buf: Buffer, encoding: string) => buf.toString(encoding as BufferEncoding),
  },
}));

import { HyperswarmTransport } from './HyperswarmTransport.js';

describe('HyperswarmTransport', () => {
  let transport: HyperswarmTransport;
  const identity = { nickname: 'tester', tag: 'AB12' };

  beforeEach(() => {
    transport = new HyperswarmTransport(identity);
    vi.clearAllMocks();
    mockSwarm.removeAllListeners();
    mockSwarm.join = vi.fn().mockReturnValue(mockDiscovery);
    mockDiscovery.flushed = vi.fn().mockResolvedValue(undefined);
    mockDiscovery.refresh = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await transport.destroy();
  });

  describe('sessionToTopic', () => {
    it('produces consistent 32-byte Buffer from same sessionId', () => {
      const topic1 = HyperswarmTransport.sessionToTopic('test-session-id');
      const topic2 = HyperswarmTransport.sessionToTopic('test-session-id');
      expect(topic1).toBeInstanceOf(Buffer);
      expect(topic1.length).toBe(32);
      expect(topic1.equals(topic2)).toBe(true);
    });

    it('produces different topics for different sessionIds', () => {
      const topic1 = HyperswarmTransport.sessionToTopic('session-1');
      const topic2 = HyperswarmTransport.sessionToTopic('session-2');
      expect(topic1.equals(topic2)).toBe(false);
    });
  });

  describe('topicToHex', () => {
    it('produces 64-char hex string', () => {
      const topic = Buffer.alloc(32, 0xab);
      const hex = HyperswarmTransport.topicToHex(topic);
      expect(hex).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
    });
  });

  describe('isConnected', () => {
    it('returns false initially', () => {
      expect(transport.isConnected).toBe(false);
    });
  });

  describe('send', () => {
    it('does nothing when not connected (no throw)', () => {
      expect(() => transport.send('hello', Date.now())).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('resets state', async () => {
      await transport.connect('test-session');
      await transport.cleanup();
      expect(transport.isConnected).toBe(false);
    });
  });

  describe('connection handling', () => {
    it('destroys duplicate connection (only first connection kept)', async () => {
      await transport.connect('test-session');

      const conn1 = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn1.write = vi.fn();
      conn1.destroy = vi.fn();
      mockSwarm.emit('connection', conn1, {});

      const conn2 = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn2.write = vi.fn();
      conn2.destroy = vi.fn();
      mockSwarm.emit('connection', conn2, {});
      expect(conn2.destroy).toHaveBeenCalled();
    });

    it('destroys connection on handshake sessionId mismatch', async () => {
      await transport.connect('correct-session');

      const conn = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn.write = vi.fn();
      conn.destroy = vi.fn();
      mockSwarm.emit('connection', conn, {});

      const wrongHandshake = JSON.stringify({
        type: 'handshake',
        nickname: 'peer',
        tag: 'CD34',
        sessionId: 'wrong-session',
      }) + '\n';
      conn.emit('data', Buffer.from(wrongHandshake));
      expect(conn.destroy).toHaveBeenCalled();
    });

    it('emits connected with peer identity after successful handshake', async () => {
      await transport.connect('test-session');

      const conn = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn.write = vi.fn();
      conn.destroy = vi.fn();

      const connectedPromise = new Promise<{ nickname: string; tag: string }>((resolve) => {
        transport.on('connected', resolve);
      });

      mockSwarm.emit('connection', conn, {});

      const handshake = JSON.stringify({
        type: 'handshake',
        nickname: 'peer',
        tag: 'CD34',
        sessionId: 'test-session',
      }) + '\n';
      conn.emit('data', Buffer.from(handshake));

      const peerIdentity = await connectedPromise;
      expect(peerIdentity).toEqual({ nickname: 'peer', tag: 'CD34' });
      expect(transport.isConnected).toBe(true);
    });

    it('emits disconnected after peer disconnects', async () => {
      await transport.connect('test-session');

      const conn = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn.write = vi.fn();
      conn.destroy = vi.fn();
      mockSwarm.emit('connection', conn, {});

      conn.emit('data', Buffer.from(JSON.stringify({
        type: 'handshake', nickname: 'peer', tag: 'CD34', sessionId: 'test-session',
      }) + '\n'));

      const disconnectedPromise = new Promise<void>((resolve) => {
        transport.on('disconnected', resolve);
      });
      conn.emit('close');
      await disconnectedPromise;
      expect(transport.isConnected).toBe(false);
    });

    it('sends messages over P2P after handshake', async () => {
      await transport.connect('test-session');

      const conn = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn.write = vi.fn();
      conn.destroy = vi.fn();
      mockSwarm.emit('connection', conn, {});

      conn.emit('data', Buffer.from(JSON.stringify({
        type: 'handshake', nickname: 'peer', tag: 'CD34', sessionId: 'test-session',
      }) + '\n'));

      const timestamp = Date.now();
      transport.send('hello world', timestamp);
      expect(conn.write).toHaveBeenCalledWith(
        JSON.stringify({ type: 'message', content: 'hello world', timestamp }) + '\n',
      );
    });

    it('emits message event on incoming P2P message', async () => {
      await transport.connect('test-session');

      const conn = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      conn.write = vi.fn();
      conn.destroy = vi.fn();
      mockSwarm.emit('connection', conn, {});

      conn.emit('data', Buffer.from(JSON.stringify({
        type: 'handshake', nickname: 'peer', tag: 'CD34', sessionId: 'test-session',
      }) + '\n'));

      const messagePromise = new Promise<{ content: string; timestamp: number }>((resolve) => {
        transport.on('message', resolve);
      });

      conn.emit('data', Buffer.from(JSON.stringify({
        type: 'message', content: 'hi there', timestamp: 12345,
      }) + '\n'));

      const msg = await messagePromise;
      expect(msg).toEqual({ content: 'hi there', timestamp: 12345 });
    });
  });
});
