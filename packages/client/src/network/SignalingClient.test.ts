import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  MessageType,
  PROTOCOL_VERSION,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
} from '@cling-talk/shared';
import type { Identity } from '@cling-talk/shared';

// Mock WebSocket before importing SignalingClient
class MockWebSocket extends EventEmitter {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  sentMessages: string[] = [];

  constructor(public url: string) {
    super();
    // Simulate async open
    setTimeout(() => this.emit('open'), 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }
}

let mockWsInstances: MockWebSocket[] = [];

vi.mock('ws', () => ({
  WebSocket: class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWsInstances.push(this);
    }

    static get OPEN() {
      return MockWebSocket.OPEN;
    }

    static get CLOSED() {
      return MockWebSocket.CLOSED;
    }
  },
}));

// Import after mock
const { SignalingClient } = await import('./SignalingClient.js');

const testIdentity: Identity = {
  nickname: 'tester',
  tag: '0A1B',
  aiCli: 'Claude Code',
  schemaVersion: 1,
};

describe('SignalingClient', () => {
  let client: InstanceType<typeof SignalingClient>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWsInstances = [];
  });

  afterEach(() => {
    client?.disconnect();
    vi.useRealTimers();
  });

  describe('getReconnectDelay', () => {
    it('should return ~500ms range for attempt 0', () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      // Access private method via any
      const delay = (client as any).getReconnectDelay(0);
      // base = 500 * 2^0 = 500, jitter = 0.5-1.5x -> range 250-750
      expect(delay).toBeGreaterThanOrEqual(250);
      expect(delay).toBeLessThanOrEqual(750);
    });

    it('should return ~16000ms range for attempt 5', () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const delay = (client as any).getReconnectDelay(5);
      // base = 500 * 2^5 = 16000, jitter 0.5-1.5x -> range 8000-24000
      expect(delay).toBeGreaterThanOrEqual(8000);
      expect(delay).toBeLessThanOrEqual(24000);
    });

    it('should cap at RECONNECT_MAX_DELAY_MS range for high attempts', () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const delay = (client as any).getReconnectDelay(10);
      // base = 500 * 2^10 = 512000, capped to 30000, jitter 0.5-1.5x -> 15000-45000
      expect(delay).toBeGreaterThanOrEqual(RECONNECT_MAX_DELAY_MS * 0.5);
      expect(delay).toBeLessThanOrEqual(RECONNECT_MAX_DELAY_MS * 1.5);
    });
  });

  describe('connect', () => {
    it('should send REGISTER message on open', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      client.connect();

      // Let the setTimeout in MockWebSocket fire
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      expect(ws.sentMessages.length).toBe(1);
      const sent = JSON.parse(ws.sentMessages[0]!);
      expect(sent.type).toBe(MessageType.REGISTER);
      expect(sent.nickname).toBe('tester');
      expect(sent.tag).toBe('0A1B');
      expect(sent.protocolVersion).toBe(PROTOCOL_VERSION);
    });
  });

  describe('event emission', () => {
    it('should emit connected and nearby_users on REGISTERED message', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const connectedSpy = vi.fn();
      const nearbySpy = vi.fn();
      client.on('connected', connectedSpy);
      client.on('nearby_users', nearbySpy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      const serverMsg = {
        type: MessageType.REGISTERED,
        users: [{ nickname: 'alice', tag: 'AA11', aiCli: 'Codex', distance: 1.2, status: 'online' }],
      };
      ws.emit('message', JSON.stringify(serverMsg));

      expect(connectedSpy).toHaveBeenCalledOnce();
      expect(nearbySpy).toHaveBeenCalledWith(serverMsg.users);
    });

    it('should emit nearby_users on NEARBY_USERS message', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const nearbySpy = vi.fn();
      client.on('nearby_users', nearbySpy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      const users = [{ nickname: 'bob', tag: 'BB22', aiCli: 'Gemini', distance: 2.5, status: 'online' }];
      ws.emit('message', JSON.stringify({ type: MessageType.NEARBY_USERS, users }));

      expect(nearbySpy).toHaveBeenCalledWith(users);
    });

    it('should emit user_joined on USER_JOINED message', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const spy = vi.fn();
      client.on('user_joined', spy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      const user = { nickname: 'carol', tag: 'CC33', aiCli: 'Cursor', distance: 0.5, status: 'online' };
      ws.emit('message', JSON.stringify({ type: MessageType.USER_JOINED, user }));

      expect(spy).toHaveBeenCalledWith(user);
    });

    it('should emit user_left on USER_LEFT message', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const spy = vi.fn();
      client.on('user_left', spy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      ws.emit('message', JSON.stringify({ type: MessageType.USER_LEFT, nickname: 'carol', tag: 'CC33' }));

      expect(spy).toHaveBeenCalledWith({ nickname: 'carol', tag: 'CC33' });
    });

    it('should emit error on ERROR message', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const spy = vi.fn();
      client.on('error', spy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      ws.emit('message', JSON.stringify({ type: MessageType.ERROR, code: 'TEST', message: 'test error' }));

      expect(spy).toHaveBeenCalledWith({ code: 'TEST', message: 'test error' });
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket without reconnecting', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const reconnectingSpy = vi.fn();
      client.on('reconnecting', reconnectingSpy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      client.disconnect();

      // Advance time to ensure no reconnect scheduled
      await vi.advanceTimersByTimeAsync(60000);
      expect(reconnectingSpy).not.toHaveBeenCalled();
      // Only one WebSocket instance created (no reconnect)
      expect(mockWsInstances.length).toBe(1);
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat interval after connection', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      // Register first to simulate connected state
      ws.emit('message', JSON.stringify({
        type: MessageType.REGISTERED,
        users: [],
      }));

      // Clear the REGISTER message
      ws.sentMessages.length = 0;

      // Advance by heartbeat interval
      await vi.advanceTimersByTimeAsync(30_000);

      // Should have sent a heartbeat
      expect(ws.sentMessages.length).toBeGreaterThanOrEqual(1);
      const hb = JSON.parse(ws.sentMessages[0]!);
      expect(hb.type).toBe(MessageType.HEARTBEAT);
    });
  });

  describe('reconnection', () => {
    it('should emit reconnecting on unexpected close', async () => {
      client = new SignalingClient('ws://localhost:3456', testIdentity);
      const reconnectingSpy = vi.fn();
      client.on('reconnecting', reconnectingSpy);

      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      const ws = mockWsInstances[0]!;
      // Simulate unexpected close
      ws.readyState = MockWebSocket.CLOSED;
      ws.emit('close');

      expect(reconnectingSpy).toHaveBeenCalledOnce();
    });
  });
});
