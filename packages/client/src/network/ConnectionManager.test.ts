import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock HyperswarmTransport
const mockP2PTransport = new EventEmitter() as EventEmitter & {
  connect: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  cleanup: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  isConnected: boolean;
};
mockP2PTransport.connect = vi.fn().mockResolvedValue(undefined);
mockP2PTransport.send = vi.fn();
mockP2PTransport.cleanup = vi.fn().mockResolvedValue(undefined);
mockP2PTransport.destroy = vi.fn().mockResolvedValue(undefined);
mockP2PTransport.isConnected = false;

vi.mock('./HyperswarmTransport.js', () => ({
  HyperswarmTransport: vi.fn(() => mockP2PTransport),
}));

// Static methods mock
const { HyperswarmTransport } = await import('./HyperswarmTransport.js');
(HyperswarmTransport as any).sessionToTopic = vi.fn(() => Buffer.alloc(32, 0xab));
(HyperswarmTransport as any).topicToHex = vi.fn(() => 'ab'.repeat(32));

import { ConnectionManager } from './ConnectionManager.js';

describe('ConnectionManager', () => {
  let signalingClient: EventEmitter & Record<string, ReturnType<typeof vi.fn>>;
  let manager: ConnectionManager;

  beforeEach(() => {
    vi.useFakeTimers();

    signalingClient = new EventEmitter() as any;
    signalingClient.connect = vi.fn();
    signalingClient.disconnect = vi.fn();
    signalingClient.requestChat = vi.fn();
    signalingClient.acceptChat = vi.fn();
    signalingClient.declineChat = vi.fn();
    signalingClient.sendChatMessage = vi.fn();
    signalingClient.leaveChat = vi.fn();
    signalingClient.requestNearbyUsers = vi.fn();
    signalingClient.updateRadius = vi.fn();
    signalingClient.requestFriendStatus = vi.fn();
    signalingClient.sendP2PSignal = vi.fn();
    signalingClient.sendP2PStatus = vi.fn();

    // Reset mock state
    mockP2PTransport.isConnected = false;
    mockP2PTransport.removeAllListeners();
    vi.clearAllMocks();

    manager = new ConnectionManager(signalingClient as any, { nickname: 'tester', tag: 'AB12' });
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.removeAllListeners();
  });

  describe('event proxying', () => {
    it('proxies connected event from SignalingClient', () => {
      const handler = vi.fn();
      manager.on('connected', handler);
      signalingClient.emit('connected');
      expect(handler).toHaveBeenCalled();
    });

    it('proxies reconnecting event from SignalingClient', () => {
      const handler = vi.fn();
      manager.on('reconnecting', handler);
      signalingClient.emit('reconnecting');
      expect(handler).toHaveBeenCalled();
    });

    it('proxies nearby_users event from SignalingClient', () => {
      const handler = vi.fn();
      manager.on('nearby_users', handler);
      const users = [{ nickname: 'user1', tag: '1234' }];
      signalingClient.emit('nearby_users', users);
      expect(handler).toHaveBeenCalledWith(users);
    });

    it('ignores chat_msg from SignalingClient (P2P only)', () => {
      const handler = vi.fn();
      manager.on('chat_msg', handler);
      const data = { sessionId: 's1', from: { nickname: 'u', tag: 't' }, content: 'hi', timestamp: 123 };
      signalingClient.emit('chat_msg', data);
      // chat_msg from server is intentionally ignored in P2P-only architecture
      expect(handler).not.toHaveBeenCalled();
    });

    it('proxies chat_requested event from SignalingClient', () => {
      const handler = vi.fn();
      manager.on('chat_requested', handler);
      signalingClient.emit('chat_requested', { sessionId: 's1', from: {} });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('method delegation', () => {
    it('delegates connect to SignalingClient', () => {
      manager.connect();
      expect(signalingClient.connect).toHaveBeenCalled();
    });

    it('delegates requestChat to SignalingClient', () => {
      manager.requestChat('nick', 'TAG1');
      expect(signalingClient.requestChat).toHaveBeenCalledWith('nick', 'TAG1');
    });

    it('delegates acceptChat to SignalingClient', () => {
      manager.acceptChat('session-id');
      expect(signalingClient.acceptChat).toHaveBeenCalledWith('session-id');
    });

    it('delegates declineChat to SignalingClient', () => {
      manager.declineChat('session-id');
      expect(signalingClient.declineChat).toHaveBeenCalledWith('session-id');
    });
  });

  describe('sendChatMessage routing', () => {
    it('emits error when P2P not connected', () => {
      const handler = vi.fn();
      manager.on('chat_error', handler);
      manager.sendChatMessage('session-1', 'hello');
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('P2P') }));
      expect(mockP2PTransport.send).not.toHaveBeenCalled();
    });

    it('routes through P2P when activeTransport is direct', () => {
      // Simulate P2P upgrade success
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      // Simulate P2P connected
      mockP2PTransport.isConnected = true;
      mockP2PTransport.emit('connected', { nickname: 'peer', tag: 'CD34' });

      manager.sendChatMessage('session-1', 'hello p2p');
      expect(mockP2PTransport.send).toHaveBeenCalledWith('hello p2p', expect.any(Number));
      expect(signalingClient.sendChatMessage).not.toHaveBeenCalled();
    });
  });

  describe('P2P upgrade flow', () => {
    it('initiates P2P upgrade on chat_accepted', () => {
      const handler = vi.fn();
      manager.on('chat_accepted', handler);

      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      // Event should still be proxied
      expect(handler).toHaveBeenCalled();

      // P2P signal should be sent
      expect(signalingClient.sendP2PSignal).toHaveBeenCalledWith('session-1', 'ab'.repeat(32));
    });

    it('emits transport_changed with direct on P2P success', () => {
      const handler = vi.fn();
      manager.on('transport_changed', handler);

      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      mockP2PTransport.isConnected = true;
      mockP2PTransport.emit('connected', { nickname: 'peer', tag: 'CD34' });

      expect(handler).toHaveBeenCalledWith('direct');
      expect(manager.transportType).toBe('direct');
    });

    it('emits transport_changed with relay on P2P downgrade', () => {
      // First upgrade to direct
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      mockP2PTransport.isConnected = true;
      mockP2PTransport.emit('connected', { nickname: 'peer', tag: 'CD34' });

      const handler = vi.fn();
      manager.on('transport_changed', handler);

      // Simulate P2P disconnect
      mockP2PTransport.isConnected = false;
      mockP2PTransport.emit('disconnected');

      expect(handler).toHaveBeenCalledWith('relay');
      expect(manager.transportType).toBe('relay');
    });

    it('stays on relay after P2P timeout (3s)', () => {
      const handler = vi.fn();
      manager.on('transport_changed', handler);

      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      // Advance past P2P timeout (3000ms)
      vi.advanceTimersByTime(3001);

      // Should NOT emit transport_changed - stays on relay
      expect(handler).not.toHaveBeenCalled();
      expect(manager.transportType).toBe('relay');
    });
  });

  describe('transportType getter', () => {
    it('returns relay by default', () => {
      expect(manager.transportType).toBe('relay');
    });
  });

  describe('leaveChat', () => {
    it('cleans up P2P and delegates to SignalingClient', () => {
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      manager.leaveChat('session-1');
      expect(mockP2PTransport.cleanup).toHaveBeenCalled();
      expect(signalingClient.leaveChat).toHaveBeenCalledWith('session-1');
    });
  });

  describe('P2P message to chat_msg conversion', () => {
    it('converts P2P messages to chat_msg events', () => {
      const handler = vi.fn();
      manager.on('chat_msg', handler);

      // Set up active session with partner
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      mockP2PTransport.isConnected = true;
      mockP2PTransport.emit('connected', { nickname: 'peer', tag: 'CD34' });

      // Simulate P2P message
      mockP2PTransport.emit('message', { content: 'p2p hello', timestamp: 99999 });

      expect(handler).toHaveBeenCalledWith({
        sessionId: 'session-1',
        from: { nickname: 'peer', tag: 'CD34' },
        content: 'p2p hello',
        timestamp: 99999,
      });
    });
  });

  describe('p2p_signal handling (acceptor side)', () => {
    it('joins as acceptor when receiving p2p_signal from server', () => {
      // Simulate being the acceptor - receiving p2p_signal from partner via server
      signalingClient.emit('p2p_signal', { sessionId: 'session-1', topic: 'ab'.repeat(32) });

      expect(mockP2PTransport.connect).toHaveBeenCalledWith('session-1', false);
    });
  });

  describe('chat cleanup on chat_left/chat_user_offline', () => {
    it('ignores chat_left during P2P connecting phase', () => {
      const handler = vi.fn();
      manager.on('chat_left', handler);
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      // During P2P connecting, chat_left from partner is ignored
      signalingClient.emit('chat_left', { sessionId: 'session-1', nickname: 'peer', tag: 'CD34' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('cleans up P2P on chat_left when P2P is connected', () => {
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      // Simulate P2P connected
      mockP2PTransport.isConnected = true;
      mockP2PTransport.emit('connected', { nickname: 'peer', tag: 'CD34' });

      signalingClient.emit('chat_left', { sessionId: 'session-1', nickname: 'peer', tag: 'CD34' });
      expect(mockP2PTransport.cleanup).toHaveBeenCalled();
    });

    it('cleans up P2P on chat_user_offline', () => {
      signalingClient.emit('chat_accepted', {
        sessionId: 'session-1',
        partner: { nickname: 'peer', tag: 'CD34', aiCli: 'Claude Code', distance: 1, status: 'online' },
      });

      signalingClient.emit('chat_user_offline', { nickname: 'peer', tag: 'CD34' });
      expect(mockP2PTransport.cleanup).toHaveBeenCalled();
    });
  });
});
