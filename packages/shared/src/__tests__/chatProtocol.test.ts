import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// These imports will fail until implementation exists
import {
  MessageType,
  chatRequestSchema,
  chatAcceptSchema,
  chatDeclineSchema,
  chatMessageSchema,
  chatLeaveSchema,
  chatRequestedSchema,
  chatAcceptedSchema,
  chatDeclinedSchema,
  chatMsgSchema,
  chatLeftSchema,
  chatUserOfflineSchema,
  chatErrorSchema,
  clientMessageSchema,
  serverMessageSchema,
} from '../protocol.js';
import { CHAT_REQUEST_TIMEOUT_MS, MAX_CHAT_MESSAGE_LENGTH } from '../constants.js';

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';

const validNearbyUser = {
  nickname: 'alice',
  tag: 'AA11',
  aiCli: 'Claude Code' as const,
  distance: 1.2,
  status: 'online' as const,
};

describe('Chat Protocol Constants', () => {
  it('should export CHAT_REQUEST_TIMEOUT_MS as 30000', () => {
    expect(CHAT_REQUEST_TIMEOUT_MS).toBe(30_000);
  });

  it('should export MAX_CHAT_MESSAGE_LENGTH as 2000', () => {
    expect(MAX_CHAT_MESSAGE_LENGTH).toBe(2000);
  });
});

describe('Chat Protocol - Client Schemas', () => {
  describe('chatRequestSchema', () => {
    it('should validate correct payload', () => {
      const result = chatRequestSchema.safeParse({
        type: 'chat_request',
        targetNickname: 'alice',
        targetTag: 'AA11',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing targetNickname', () => {
      const result = chatRequestSchema.safeParse({
        type: 'chat_request',
        targetTag: 'AA11',
      });
      expect(result.success).toBe(false);
    });

    it('should reject wrong type', () => {
      const result = chatRequestSchema.safeParse({
        type: 'wrong',
        targetNickname: 'alice',
        targetTag: 'AA11',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatAcceptSchema', () => {
    it('should validate correct payload', () => {
      const result = chatAcceptSchema.safeParse({
        type: 'chat_accept',
        sessionId: SESSION_ID,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID sessionId', () => {
      const result = chatAcceptSchema.safeParse({
        type: 'chat_accept',
        sessionId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatDeclineSchema', () => {
    it('should validate correct payload', () => {
      const result = chatDeclineSchema.safeParse({
        type: 'chat_decline',
        sessionId: SESSION_ID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatMessageSchema', () => {
    it('should validate correct payload', () => {
      const result = chatMessageSchema.safeParse({
        type: 'chat_message',
        sessionId: SESSION_ID,
        content: 'Hello!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = chatMessageSchema.safeParse({
        type: 'chat_message',
        sessionId: SESSION_ID,
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject content over 2000 chars', () => {
      const result = chatMessageSchema.safeParse({
        type: 'chat_message',
        sessionId: SESSION_ID,
        content: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept content exactly 2000 chars', () => {
      const result = chatMessageSchema.safeParse({
        type: 'chat_message',
        sessionId: SESSION_ID,
        content: 'a'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatLeaveSchema', () => {
    it('should validate correct payload', () => {
      const result = chatLeaveSchema.safeParse({
        type: 'chat_leave',
        sessionId: SESSION_ID,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Chat Protocol - Server Schemas', () => {
  describe('chatRequestedSchema', () => {
    it('should validate correct payload', () => {
      const result = chatRequestedSchema.safeParse({
        type: 'chat_requested',
        sessionId: SESSION_ID,
        from: validNearbyUser,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing from field', () => {
      const result = chatRequestedSchema.safeParse({
        type: 'chat_requested',
        sessionId: SESSION_ID,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatAcceptedSchema', () => {
    it('should validate correct payload', () => {
      const result = chatAcceptedSchema.safeParse({
        type: 'chat_accepted',
        sessionId: SESSION_ID,
        partner: validNearbyUser,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatDeclinedSchema', () => {
    it('should validate correct payload', () => {
      const result = chatDeclinedSchema.safeParse({
        type: 'chat_declined',
        sessionId: SESSION_ID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatMsgSchema', () => {
    it('should validate correct payload', () => {
      const result = chatMsgSchema.safeParse({
        type: 'chat_msg',
        sessionId: SESSION_ID,
        from: { nickname: 'alice', tag: 'AA11' },
        content: 'Hello!',
        timestamp: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing timestamp', () => {
      const result = chatMsgSchema.safeParse({
        type: 'chat_msg',
        sessionId: SESSION_ID,
        from: { nickname: 'alice', tag: 'AA11' },
        content: 'Hello!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatLeftSchema', () => {
    it('should validate correct payload', () => {
      const result = chatLeftSchema.safeParse({
        type: 'chat_left',
        sessionId: SESSION_ID,
        nickname: 'alice',
        tag: 'AA11',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatUserOfflineSchema', () => {
    it('should validate correct payload', () => {
      const result = chatUserOfflineSchema.safeParse({
        type: 'chat_user_offline',
        nickname: 'alice',
        tag: 'AA11',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatErrorSchema', () => {
    it('should validate correct payload', () => {
      const result = chatErrorSchema.safeParse({
        type: 'chat_error',
        code: 'USER_BUSY',
        message: 'User is already in a chat',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Discriminated Unions', () => {
  it('should include all client chat schemas in clientMessageSchema', () => {
    const types = ['chat_request', 'chat_accept', 'chat_decline', 'chat_message', 'chat_leave'];
    for (const type of types) {
      // Build a minimal valid message for each type
      let msg: Record<string, unknown>;
      switch (type) {
        case 'chat_request':
          msg = { type, targetNickname: 'test', targetTag: 'ABCD' };
          break;
        case 'chat_message':
          msg = { type, sessionId: SESSION_ID, content: 'hi' };
          break;
        default:
          msg = { type, sessionId: SESSION_ID };
          break;
      }
      const result = clientMessageSchema.safeParse(msg);
      expect(result.success, `clientMessageSchema should accept type "${type}"`).toBe(true);
    }
  });

  it('should include all server chat schemas in serverMessageSchema', () => {
    const serverMsgs = [
      { type: 'chat_requested', sessionId: SESSION_ID, from: validNearbyUser },
      { type: 'chat_accepted', sessionId: SESSION_ID, partner: validNearbyUser },
      { type: 'chat_declined', sessionId: SESSION_ID },
      { type: 'chat_msg', sessionId: SESSION_ID, from: { nickname: 'a', tag: 'BB11' }, content: 'hi', timestamp: 123 },
      { type: 'chat_left', sessionId: SESSION_ID, nickname: 'a', tag: 'BB11' },
      { type: 'chat_user_offline', nickname: 'a', tag: 'BB11' },
      { type: 'chat_error', code: 'TEST', message: 'test' },
    ];
    for (const msg of serverMsgs) {
      const result = serverMessageSchema.safeParse(msg);
      expect(result.success, `serverMessageSchema should accept type "${msg.type}"`).toBe(true);
    }
  });
});
