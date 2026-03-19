import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { SignalingServer } from '../SignalingServer.js';
import { MessageType, PROTOCOL_VERSION } from '@cling-talk/shared';
import type { ServerMessage } from '@cling-talk/shared';

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

// --- Friend Status Tests ---

describe('Friend Status', () => {
  let server: SignalingServer;
  let port: number;
  const clients: WebSocket[] = [];

  beforeEach(async () => {
    server = new SignalingServer(0);
    port = await server.start();
  });

  afterEach(async () => {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    clients.length = 0;
    await server.stop();
  });

  async function connectAndRegister(nickname: string, tag: string): Promise<WebSocket> {
    const ws = await createClient(port);
    clients.push(ws);
    const registeredPromise = waitForMessage(ws);
    sendJson(ws, registerMsg(nickname, tag));
    await registeredPromise;
    return ws;
  }

  it('should respond to FRIEND_STATUS_REQUEST with statuses', async () => {
    // Register alice and bob
    const alice = await connectAndRegister('alice', 'AAAA');
    const bob = await connectAndRegister('bob', 'BBBB');
    // Consume alice's user_joined notification from bob's registration
    // (alice gets USER_JOINED for bob)

    // Alice requests friend status for bob and unknown user
    const responsePromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_RESPONSE);
    sendJson(alice, {
      type: MessageType.FRIEND_STATUS_REQUEST,
      friends: [
        { nickname: 'bob', tag: 'BBBB' },
        { nickname: 'nobody', tag: 'FFFF' },
      ],
    });
    const response = await responsePromise;
    expect(response.type).toBe(MessageType.FRIEND_STATUS_RESPONSE);
    if (response.type === MessageType.FRIEND_STATUS_RESPONSE) {
      expect(response.statuses).toHaveLength(2);
      const bobStatus = response.statuses.find(s => s.nickname === 'bob');
      expect(bobStatus).toBeDefined();
      expect(bobStatus!.status).toBe('online');
      const nobodyStatus = response.statuses.find(s => s.nickname === 'nobody');
      expect(nobodyStatus).toBeDefined();
      expect(nobodyStatus!.status).toBe('unknown');
    }
  });

  it('should return empty statuses for empty friends array', async () => {
    const alice = await connectAndRegister('alice', 'AAAA');
    const responsePromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_RESPONSE);
    sendJson(alice, {
      type: MessageType.FRIEND_STATUS_REQUEST,
      friends: [],
    });
    const response = await responsePromise;
    if (response.type === MessageType.FRIEND_STATUS_RESPONSE) {
      expect(response.statuses).toHaveLength(0);
    }
  });

  it('should send FRIEND_STATUS_UPDATE when tracked friend comes online', async () => {
    // Alice registers and subscribes to bob
    const alice = await connectAndRegister('alice', 'AAAA');
    const subResponsePromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_RESPONSE);
    sendJson(alice, {
      type: MessageType.FRIEND_STATUS_REQUEST,
      friends: [{ nickname: 'bob', tag: 'BBBB' }],
    });
    await subResponsePromise;

    // Now bob registers — alice should get FRIEND_STATUS_UPDATE
    const updatePromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_UPDATE);
    const bob = await connectAndRegister('bob', 'BBBB');
    const update = await updatePromise;
    expect(update.type).toBe(MessageType.FRIEND_STATUS_UPDATE);
    if (update.type === MessageType.FRIEND_STATUS_UPDATE) {
      expect(update.nickname).toBe('bob');
      expect(update.tag).toBe('BBBB');
      expect(update.status).toBe('online');
    }
  });

  it('should send FRIEND_STATUS_UPDATE with offline when tracked friend disconnects', async () => {
    // Both register
    const alice = await connectAndRegister('alice', 'AAAA');
    const bob = await connectAndRegister('bob', 'BBBB');

    // Alice subscribes to bob
    const subPromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_RESPONSE);
    sendJson(alice, {
      type: MessageType.FRIEND_STATUS_REQUEST,
      friends: [{ nickname: 'bob', tag: 'BBBB' }],
    });
    await subPromise;

    // Bob disconnects
    const updatePromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_UPDATE);
    bob.close();
    const update = await updatePromise;
    if (update.type === MessageType.FRIEND_STATUS_UPDATE) {
      expect(update.nickname).toBe('bob');
      expect(update.tag).toBe('BBBB');
      expect(update.status).toBe('offline');
    }
  });

  it('should clean up friendSubscriptions when subscriber disconnects', async () => {
    const alice = await connectAndRegister('alice', 'AAAA');

    // Alice subscribes
    const subPromise = waitForMessageOfType(alice, MessageType.FRIEND_STATUS_RESPONSE);
    sendJson(alice, {
      type: MessageType.FRIEND_STATUS_REQUEST,
      friends: [{ nickname: 'bob', tag: 'BBBB' }],
    });
    await subPromise;

    // Alice disconnects — no errors should occur
    alice.close();
    // Wait briefly for server to process the close
    await new Promise(r => setTimeout(r, 100));

    // Now bob registers — should not crash even though alice subscription was cleaned up
    const bob = await connectAndRegister('bob', 'BBBB');
    // If we got here without errors, cleanup worked
    expect(bob.readyState).toBe(WebSocket.OPEN);
  });
});
