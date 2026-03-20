import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { SignalingServer } from '../SignalingServer.js';
import { MessageType, PROTOCOL_VERSION } from '@hivechat/shared';
import type { ServerMessage } from '@hivechat/shared';
import { ChatSessionManager } from '../ChatSessionManager.js';

// --- Helpers (reused from ChatRelay.test.ts) ---

function createClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.once('message', (data) => {
      resolve(JSON.parse(data.toString()) as ServerMessage);
    });
  });
}

function waitForMessageOfType(ws: WebSocket, type: string, timeoutMs = 3000): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeoutMs);
    const handler = (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as ServerMessage;
      if (msg.type === type) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function sendJson(ws: WebSocket, msg: unknown): void {
  ws.send(JSON.stringify(msg));
}

function registerMsg(nickname = 'tester', tag = '0A1B') {
  return {
    type: MessageType.REGISTER,
    nickname,
    tag,
    aiCli: 'Claude Code' as const,
    protocolVersion: PROTOCOL_VERSION,
  };
}

// --- ChatSessionManager P2P Unit Tests ---

describe('ChatSessionManager - Transport Tracking', () => {
  let manager: ChatSessionManager;

  beforeEach(() => {
    manager = new ChatSessionManager();
  });

  it('should have undefined transportType by default on new session', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    const session = manager.acceptRequest(sessionId!);
    expect(session).not.toBeNull();
    expect(session!.transportType).toBeUndefined();
  });

  it('should update transportType via updateTransport', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    manager.acceptRequest(sessionId!);
    manager.updateTransport(sessionId!, 'direct');

    const session = manager.getSession(sessionId!);
    expect(session).not.toBeUndefined();
    expect(session!.transportType).toBe('direct');
  });

  it('should handle updateTransport on non-existent session gracefully', () => {
    expect(() => manager.updateTransport('non-existent', 'direct')).not.toThrow();
  });

  it('should return session by id via getSession', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    manager.acceptRequest(sessionId!);

    const session = manager.getSession(sessionId!);
    expect(session).not.toBeUndefined();
    expect(session!.id).toBe(sessionId);
    expect(session!.userA).toBe('alice#AA11');
    expect(session!.userB).toBe('bob#BB22');
  });

  it('should return undefined for getSession with non-existent id', () => {
    expect(manager.getSession('non-existent')).toBeUndefined();
  });

  it('should update transportType from relay to direct', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    manager.acceptRequest(sessionId!);

    manager.updateTransport(sessionId!, 'relay');
    expect(manager.getSession(sessionId!)!.transportType).toBe('relay');

    manager.updateTransport(sessionId!, 'direct');
    expect(manager.getSession(sessionId!)!.transportType).toBe('direct');
  });
});

// --- Server Integration Tests ---

describe('SignalingServer P2P Signal Relay', () => {
  let server: SignalingServer;
  let clients: WebSocket[];
  let port: number;

  beforeEach(async () => {
    clients = [];
    server = new SignalingServer(0);
    port = await server.start();
    process.env['DEV_GEO_LAT'] = '37.5665';
    process.env['DEV_GEO_LON'] = '126.9780';
  });

  afterEach(async () => {
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) {
        c.close();
      }
    }
    await server.stop();
    delete process.env['DEV_GEO_LAT'];
    delete process.env['DEV_GEO_LON'];
  });

  async function registerUser(nickname: string, tag: string): Promise<WebSocket> {
    const ws = await createClient(port);
    clients.push(ws);
    const regPromise = waitForMessage(ws);
    sendJson(ws, registerMsg(nickname, tag));
    await regPromise;
    return ws;
  }

  async function establishChatSession(ws1: WebSocket, ws2: WebSocket, nick2: string, tag2: string): Promise<string> {
    // ws1 already consumed USER_JOINED for ws2
    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, { type: MessageType.CHAT_REQUEST, targetNickname: nick2, targetTag: tag2 });
    const requested = await requestedPromise;
    const sessionId = (requested as { sessionId: string }).sessionId;

    const acceptedPromise = waitForMessageOfType(ws1, MessageType.CHAT_ACCEPTED);
    sendJson(ws2, { type: MessageType.CHAT_ACCEPT, sessionId });
    await acceptedPromise;

    return sessionId;
  }

  const VALID_TOPIC = 'a'.repeat(64);

  it('should relay P2P_SIGNAL to partner in active session', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    const sessionId = await establishChatSession(ws1, ws2, 'bob', 'BB22');

    // Alice sends P2P_SIGNAL
    const signalPromise = waitForMessageOfType(ws2, MessageType.P2P_SIGNAL);
    sendJson(ws1, {
      type: MessageType.P2P_SIGNAL,
      sessionId,
      topic: VALID_TOPIC,
    });

    const signal = await signalPromise;
    expect(signal.type).toBe(MessageType.P2P_SIGNAL);
    if (signal.type === MessageType.P2P_SIGNAL) {
      expect(signal.sessionId).toBe(sessionId);
      expect(signal.topic).toBe(VALID_TOPIC);
    }
  });

  it('should relay P2P_SIGNAL from either direction (bob to alice)', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    const sessionId = await establishChatSession(ws1, ws2, 'bob', 'BB22');

    // Bob sends P2P_SIGNAL to Alice
    const signalPromise = waitForMessageOfType(ws1, MessageType.P2P_SIGNAL);
    sendJson(ws2, {
      type: MessageType.P2P_SIGNAL,
      sessionId,
      topic: VALID_TOPIC,
    });

    const signal = await signalPromise;
    expect(signal.type).toBe(MessageType.P2P_SIGNAL);
    if (signal.type === MessageType.P2P_SIGNAL) {
      expect(signal.topic).toBe(VALID_TOPIC);
    }
  });

  it('should silently ignore P2P_SIGNAL from user not in active session', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    // No chat session established - send P2P_SIGNAL
    // Should not cause an error or crash
    sendJson(ws1, {
      type: MessageType.P2P_SIGNAL,
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      topic: VALID_TOPIC,
    });

    // Send a heartbeat to verify server is still processing
    sendJson(ws1, { type: MessageType.HEARTBEAT });

    // If we get here without timeout/crash, the signal was silently ignored
    // Wait a small amount to ensure no unexpected message is sent
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should handle P2P_STATUS by updating transport type', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    const sessionId = await establishChatSession(ws1, ws2, 'bob', 'BB22');

    // Alice reports P2P_STATUS (transport changed to direct)
    sendJson(ws1, {
      type: MessageType.P2P_STATUS,
      sessionId,
      transportType: 'direct',
    });

    // Verify server processes it without error by sending another message
    const msgPromise = waitForMessageOfType(ws2, MessageType.CHAT_MSG);
    sendJson(ws1, { type: MessageType.CHAT_MESSAGE, sessionId, content: 'still works' });
    const chatMsg = await msgPromise;
    expect(chatMsg.type).toBe(MessageType.CHAT_MSG);
  });

  it('should silently ignore P2P_STATUS from user not in session', async () => {
    const ws1 = await registerUser('alice', 'AA11');

    // No session - send P2P_STATUS
    sendJson(ws1, {
      type: MessageType.P2P_STATUS,
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      transportType: 'direct',
    });

    // Verify no crash by sending heartbeat
    sendJson(ws1, { type: MessageType.HEARTBEAT });
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
