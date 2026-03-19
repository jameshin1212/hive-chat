import { describe, it, expect } from 'vitest';

import {
  MessageType,
  p2pSignalSchema,
  p2pStatusSchema,
  clientMessageSchema,
  serverMessageSchema,
} from '../protocol.js';

import { P2P_UPGRADE_TIMEOUT_MS } from '../constants.js';
import type { TransportType } from '../types.js';

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TOPIC = 'a'.repeat(64); // 64 hex chars (32 bytes)

describe('P2P Protocol Constants', () => {
  it('should export P2P_UPGRADE_TIMEOUT_MS as 3000', () => {
    expect(P2P_UPGRADE_TIMEOUT_MS).toBe(3_000);
  });
});

describe('TransportType', () => {
  it('should accept relay and direct as valid TransportType values', () => {
    const relay: TransportType = 'relay';
    const direct: TransportType = 'direct';
    expect(relay).toBe('relay');
    expect(direct).toBe('direct');
  });
});

describe('P2P Protocol - p2pSignalSchema', () => {
  it('should validate correct payload', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'p2p_signal',
      sessionId: SESSION_ID,
      topic: VALID_TOPIC,
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing sessionId', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'p2p_signal',
      topic: VALID_TOPIC,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID sessionId', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'p2p_signal',
      sessionId: 'not-a-uuid',
      topic: VALID_TOPIC,
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing topic', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'p2p_signal',
      sessionId: SESSION_ID,
    });
    expect(result.success).toBe(false);
  });

  it('should reject topic with invalid hex (uppercase)', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'p2p_signal',
      sessionId: SESSION_ID,
      topic: 'A'.repeat(64),
    });
    expect(result.success).toBe(false);
  });

  it('should reject topic with wrong length', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'p2p_signal',
      sessionId: SESSION_ID,
      topic: 'a'.repeat(32),
    });
    expect(result.success).toBe(false);
  });

  it('should reject wrong type literal', () => {
    const result = p2pSignalSchema.safeParse({
      type: 'wrong',
      sessionId: SESSION_ID,
      topic: VALID_TOPIC,
    });
    expect(result.success).toBe(false);
  });
});

describe('P2P Protocol - p2pStatusSchema', () => {
  it('should validate correct payload with relay', () => {
    const result = p2pStatusSchema.safeParse({
      type: 'p2p_status',
      sessionId: SESSION_ID,
      transportType: 'relay',
    });
    expect(result.success).toBe(true);
  });

  it('should validate correct payload with direct', () => {
    const result = p2pStatusSchema.safeParse({
      type: 'p2p_status',
      sessionId: SESSION_ID,
      transportType: 'direct',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid transportType', () => {
    const result = p2pStatusSchema.safeParse({
      type: 'p2p_status',
      sessionId: SESSION_ID,
      transportType: 'websocket',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing transportType', () => {
    const result = p2pStatusSchema.safeParse({
      type: 'p2p_status',
      sessionId: SESSION_ID,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID sessionId', () => {
    const result = p2pStatusSchema.safeParse({
      type: 'p2p_status',
      sessionId: 'not-a-uuid',
      transportType: 'relay',
    });
    expect(result.success).toBe(false);
  });
});

describe('P2P Discriminated Unions', () => {
  it('should include p2p_signal in clientMessageSchema', () => {
    const result = clientMessageSchema.safeParse({
      type: 'p2p_signal',
      sessionId: SESSION_ID,
      topic: VALID_TOPIC,
    });
    expect(result.success).toBe(true);
  });

  it('should include p2p_signal in serverMessageSchema', () => {
    const result = serverMessageSchema.safeParse({
      type: 'p2p_signal',
      sessionId: SESSION_ID,
      topic: VALID_TOPIC,
    });
    expect(result.success).toBe(true);
  });

  it('should include p2p_status in clientMessageSchema', () => {
    const result = clientMessageSchema.safeParse({
      type: 'p2p_status',
      sessionId: SESSION_ID,
      transportType: 'direct',
    });
    expect(result.success).toBe(true);
  });
});

describe('MessageType constants', () => {
  it('should have P2P_SIGNAL type', () => {
    expect(MessageType.P2P_SIGNAL).toBe('p2p_signal');
  });

  it('should have P2P_STATUS type', () => {
    expect(MessageType.P2P_STATUS).toBe('p2p_status');
  });
});
