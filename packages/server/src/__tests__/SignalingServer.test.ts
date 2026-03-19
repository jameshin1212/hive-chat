import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { SignalingServer } from '../SignalingServer.js';
import { MessageType, PROTOCOL_VERSION } from '@cling-talk/shared';
import type { ServerMessage } from '@cling-talk/shared';

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

describe('SignalingServer', () => {
  let server: SignalingServer;
  let clients: WebSocket[];
  let port: number;

  beforeEach(async () => {
    clients = [];
    // Use port 0 for dynamic allocation
    server = new SignalingServer(0);
    port = await server.start();
    // Set dev geo env for private IP fallback
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

  it('should accept connection and respond to REGISTER with REGISTERED', async () => {
    const ws = await createClient(port);
    clients.push(ws);

    const responsePromise = waitForMessage(ws);
    sendJson(ws, registerMsg());
    const response = await responsePromise;

    expect(response.type).toBe(MessageType.REGISTERED);
    if (response.type === MessageType.REGISTERED) {
      expect(response.users).toBeInstanceOf(Array);
    }
  });

  it('should return ERROR on invalid JSON', async () => {
    const ws = await createClient(port);
    clients.push(ws);

    const responsePromise = waitForMessage(ws);
    ws.send('not valid json{{{');
    const response = await responsePromise;

    expect(response.type).toBe(MessageType.ERROR);
    if (response.type === MessageType.ERROR) {
      expect(response.code).toBe('INVALID_MESSAGE');
    }
  });

  it('should return ERROR on invalid message schema', async () => {
    const ws = await createClient(port);
    clients.push(ws);

    const responsePromise = waitForMessage(ws);
    sendJson(ws, { type: 'register', nickname: 'bad' }); // missing fields
    const response = await responsePromise;

    expect(response.type).toBe(MessageType.ERROR);
    if (response.type === MessageType.ERROR) {
      expect(response.code).toBe('INVALID_MESSAGE');
    }
  });

  it('should respond to GET_NEARBY with NEARBY_USERS', async () => {
    const ws = await createClient(port);
    clients.push(ws);

    // Register first
    const regPromise = waitForMessage(ws);
    sendJson(ws, registerMsg());
    await regPromise;

    // Request nearby
    const nearbyPromise = waitForMessage(ws);
    sendJson(ws, { type: MessageType.GET_NEARBY, radiusKm: 5 });
    const response = await nearbyPromise;

    expect(response.type).toBe(MessageType.NEARBY_USERS);
    if (response.type === MessageType.NEARBY_USERS) {
      expect(response.users).toBeInstanceOf(Array);
    }
  });

  it('should broadcast USER_JOINED when second client registers', async () => {
    const ws1 = await createClient(port);
    clients.push(ws1);

    // Register first client
    const reg1Promise = waitForMessage(ws1);
    sendJson(ws1, registerMsg('alice', 'AA11'));
    await reg1Promise;

    // Listen for USER_JOINED on first client
    const joinPromise = waitForMessage(ws1);

    // Register second client
    const ws2 = await createClient(port);
    clients.push(ws2);
    const reg2Promise = waitForMessage(ws2);
    sendJson(ws2, registerMsg('bob', 'BB22'));
    await reg2Promise;

    const joinMsg = await joinPromise;
    expect(joinMsg.type).toBe(MessageType.USER_JOINED);
    if (joinMsg.type === MessageType.USER_JOINED) {
      expect(joinMsg.user.nickname).toBe('bob');
      expect(joinMsg.user.tag).toBe('BB22');
    }
  });

  it('should broadcast USER_LEFT when client disconnects', async () => {
    const ws1 = await createClient(port);
    clients.push(ws1);
    const reg1Promise = waitForMessage(ws1);
    sendJson(ws1, registerMsg('alice', 'AA11'));
    await reg1Promise;

    const ws2 = await createClient(port);
    clients.push(ws2);
    // Wait for ws2 registration AND ws1's USER_JOINED
    const reg2Promise = waitForMessage(ws2);
    const joinPromise = waitForMessage(ws1);
    sendJson(ws2, registerMsg('bob', 'BB22'));
    await reg2Promise;
    await joinPromise;

    // Now listen for USER_LEFT on ws1
    const leftPromise = waitForMessage(ws1);
    ws2.close();
    const leftMsg = await leftPromise;

    expect(leftMsg.type).toBe(MessageType.USER_LEFT);
    if (leftMsg.type === MessageType.USER_LEFT) {
      expect(leftMsg.nickname).toBe('bob');
      expect(leftMsg.tag).toBe('BB22');
    }
  });

  it('should ignore messages from unregistered connections (except REGISTER)', async () => {
    const ws = await createClient(port);
    clients.push(ws);

    // Send GET_NEARBY without registering first - should be ignored (no response)
    sendJson(ws, { type: MessageType.GET_NEARBY, radiusKm: 5 });

    // Send REGISTER and verify it still works
    const responsePromise = waitForMessage(ws);
    sendJson(ws, registerMsg());
    const response = await responsePromise;

    expect(response.type).toBe(MessageType.REGISTERED);
  });
});
