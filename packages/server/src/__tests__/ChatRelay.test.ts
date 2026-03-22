import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { SignalingServer } from '../SignalingServer.js';
import { MessageType, PROTOCOL_VERSION } from '@hivechat/shared';
import type { ServerMessage } from '@hivechat/shared';
import { ChatSessionManager } from '../ChatSessionManager.js';

// --- Helpers ---

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

// --- ChatSessionManager Unit Tests ---

describe('ChatSessionManager', () => {
  let manager: ChatSessionManager;

  beforeEach(() => {
    manager = new ChatSessionManager();
  });

  it('should create a pending request and return sessionId', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });

  it('should mark users as busy when pending request exists', () => {
    manager.createPendingRequest('alice#AA11', 'bob#BB22');
    expect(manager.isUserBusy('alice#AA11')).toBe(true);
    expect(manager.isUserBusy('bob#BB22')).toBe(true);
  });

  it('should accept a pending request and create active session', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    const session = manager.acceptRequest(sessionId);
    expect(session).not.toBeNull();
    expect(session!.userA).toBe('alice#AA11');
    expect(session!.userB).toBe('bob#BB22');
  });

  it('should return null when accepting non-existent request', () => {
    const session = manager.acceptRequest('non-existent-id');
    expect(session).toBeNull();
  });

  it('should get session by user after acceptance', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    manager.acceptRequest(sessionId);
    const session = manager.getSessionByUser('alice#AA11');
    expect(session).not.toBeUndefined();
    expect(session!.id).toBe(sessionId);

    const sessionB = manager.getSessionByUser('bob#BB22');
    expect(sessionB).not.toBeUndefined();
    expect(sessionB!.id).toBe(sessionId);
  });

  it('should remove session and free both users', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    manager.acceptRequest(sessionId);
    manager.removeSession(sessionId);

    expect(manager.getSessionByUser('alice#AA11')).toBeUndefined();
    expect(manager.getSessionByUser('bob#BB22')).toBeUndefined();
    expect(manager.isUserBusy('alice#AA11')).toBe(false);
    expect(manager.isUserBusy('bob#BB22')).toBe(false);
  });

  it('should reject createPendingRequest if requester already busy', () => {
    manager.createPendingRequest('alice#AA11', 'bob#BB22');
    const sessionId = manager.createPendingRequest('alice#AA11', 'charlie#CC33');
    expect(sessionId).toBeNull();
  });

  it('should reject createPendingRequest if target already busy', () => {
    manager.createPendingRequest('alice#AA11', 'bob#BB22');
    const sessionId = manager.createPendingRequest('charlie#CC33', 'bob#BB22');
    expect(sessionId).toBeNull();
  });

  it('should decline a pending request and free users', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    manager.declineRequest(sessionId);
    expect(manager.isUserBusy('alice#AA11')).toBe(false);
    expect(manager.isUserBusy('bob#BB22')).toBe(false);
  });

  it('should clean up pending requests by user on disconnect', () => {
    const sessionId = manager.createPendingRequest('alice#AA11', 'bob#BB22');
    const removed = manager.removePendingByUser('alice#AA11');
    expect(removed).toContain(sessionId);
    expect(manager.isUserBusy('bob#BB22')).toBe(false);
  });
});

// --- Server Integration Tests ---

describe('SignalingServer Chat Relay', () => {
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

  it('should relay CHAT_REQUEST to target as CHAT_REQUESTED', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');

    // Consume USER_JOINED on ws1
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, {
      type: MessageType.CHAT_REQUEST,
      targetNickname: 'bob',
      targetTag: 'BB22',
    });

    const requested = await requestedPromise;
    expect(requested.type).toBe(MessageType.CHAT_REQUESTED);
    if (requested.type === MessageType.CHAT_REQUESTED) {
      expect(requested.sessionId).toBeTruthy();
      expect(requested.from.nickname).toBe('alice');
    }
  });

  it('should return CHAT_ERROR for offline target', async () => {
    const ws1 = await registerUser('alice', 'AA11');

    const errorPromise = waitForMessageOfType(ws1, MessageType.CHAT_ERROR);
    sendJson(ws1, {
      type: MessageType.CHAT_REQUEST,
      targetNickname: 'nobody',
      targetTag: 'FF99',
    });

    const error = await errorPromise;
    expect(error.type).toBe(MessageType.CHAT_ERROR);
    if (error.type === MessageType.CHAT_ERROR) {
      expect(error.code).toBe('USER_OFFLINE');
    }
  });

  it('should complete chat accept flow: CHAT_ACCEPT -> CHAT_ACCEPTED', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    // Alice requests
    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, {
      type: MessageType.CHAT_REQUEST,
      targetNickname: 'bob',
      targetTag: 'BB22',
    });
    const requested = await requestedPromise;
    const sessionId = (requested as { sessionId: string }).sessionId;

    // Bob accepts
    const acceptedPromise = waitForMessageOfType(ws1, MessageType.CHAT_ACCEPTED);
    sendJson(ws2, {
      type: MessageType.CHAT_ACCEPT,
      sessionId,
    });

    const accepted = await acceptedPromise;
    expect(accepted.type).toBe(MessageType.CHAT_ACCEPTED);
    if (accepted.type === MessageType.CHAT_ACCEPTED) {
      expect(accepted.partner.nickname).toBe('bob');
    }
  });

  // CHAT_MESSAGE relay removed — P2P only architecture.
  // Messages are exchanged directly between peers via Hyperswarm.

  it('should send CHAT_DECLINED when target declines', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, { type: MessageType.CHAT_REQUEST, targetNickname: 'bob', targetTag: 'BB22' });
    const requested = await requestedPromise;
    const sessionId = (requested as { sessionId: string }).sessionId;

    const declinedPromise = waitForMessageOfType(ws1, MessageType.CHAT_DECLINED);
    sendJson(ws2, { type: MessageType.CHAT_DECLINE, sessionId });

    const declined = await declinedPromise;
    expect(declined.type).toBe(MessageType.CHAT_DECLINED);
  });

  it('should send CHAT_LEFT to partner when user leaves', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    // Establish session
    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, { type: MessageType.CHAT_REQUEST, targetNickname: 'bob', targetTag: 'BB22' });
    const requested = await requestedPromise;
    const sessionId = (requested as { sessionId: string }).sessionId;

    const acceptedPromise = waitForMessageOfType(ws1, MessageType.CHAT_ACCEPTED);
    sendJson(ws2, { type: MessageType.CHAT_ACCEPT, sessionId });
    await acceptedPromise;

    // Alice leaves
    const leftPromise = waitForMessageOfType(ws2, MessageType.CHAT_LEFT);
    sendJson(ws1, { type: MessageType.CHAT_LEAVE, sessionId });

    const left = await leftPromise;
    expect(left.type).toBe(MessageType.CHAT_LEFT);
    if (left.type === MessageType.CHAT_LEFT) {
      expect(left.nickname).toBe('alice');
    }
  });

  it('should send CHAT_USER_OFFLINE when user disconnects mid-chat', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    // Establish session
    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, { type: MessageType.CHAT_REQUEST, targetNickname: 'bob', targetTag: 'BB22' });
    const requested = await requestedPromise;
    const sessionId = (requested as { sessionId: string }).sessionId;

    const acceptedPromise = waitForMessageOfType(ws1, MessageType.CHAT_ACCEPTED);
    sendJson(ws2, { type: MessageType.CHAT_ACCEPT, sessionId });
    await acceptedPromise;

    // Alice disconnects
    const offlinePromise = waitForMessageOfType(ws2, MessageType.CHAT_USER_OFFLINE);
    ws1.close();

    const offline = await offlinePromise;
    expect(offline.type).toBe(MessageType.CHAT_USER_OFFLINE);
    if (offline.type === MessageType.CHAT_USER_OFFLINE) {
      expect(offline.nickname).toBe('alice');
      expect(offline.tag).toBe('AA11');
    }
  });

  it('should return CHAT_ERROR when target is busy', async () => {
    const ws1 = await registerUser('alice', 'AA11');
    const ws2 = await registerUser('bob', 'BB22');
    const ws3 = await registerUser('charlie', 'CC33');
    await waitForMessageOfType(ws1, MessageType.USER_JOINED);

    // Alice requests bob
    const requestedPromise = waitForMessageOfType(ws2, MessageType.CHAT_REQUESTED);
    sendJson(ws1, { type: MessageType.CHAT_REQUEST, targetNickname: 'bob', targetTag: 'BB22' });
    await requestedPromise;

    // Charlie also requests bob -> should get CHAT_ERROR USER_BUSY
    const errorPromise = waitForMessageOfType(ws3, MessageType.CHAT_ERROR);
    sendJson(ws3, { type: MessageType.CHAT_REQUEST, targetNickname: 'bob', targetTag: 'BB22' });

    const error = await errorPromise;
    expect(error.type).toBe(MessageType.CHAT_ERROR);
    if (error.type === MessageType.CHAT_ERROR) {
      expect(error.code).toBe('USER_BUSY');
    }
  });

  // "should NOT log message content" test removed — server no longer handles messages at all (P2P only)
});
