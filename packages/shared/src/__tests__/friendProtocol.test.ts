import { describe, it, expect } from 'vitest';

import {
  MessageType,
  friendStatusRequestSchema,
  friendStatusResponseSchema,
  friendStatusUpdateSchema,
  clientMessageSchema,
  serverMessageSchema,
} from '../protocol.js';

import { parseNickTag, NICK_TAG_REGEX } from '../types.js';
import type { FriendRecord } from '../types.js';

describe('parseNickTag', () => {
  it('should parse valid nick#TAG', () => {
    const result = parseNickTag('coder#3A7F');
    expect(result).toEqual({ nickname: 'coder', tag: '3A7F' });
  });

  it('should use last # as separator', () => {
    const result = parseNickTag('user#name#3A7F');
    expect(result).toEqual({ nickname: 'user#name', tag: '3A7F' });
  });

  it('should return null for input without #', () => {
    expect(parseNickTag('invalid')).toBeNull();
  });

  it('should return null for lowercase hex tag', () => {
    expect(parseNickTag('user#zzzz')).toBeNull();
  });

  it('should return null for tag with wrong length', () => {
    expect(parseNickTag('user#ABC')).toBeNull();
    expect(parseNickTag('user#ABCDE')).toBeNull();
  });

  it('should export NICK_TAG_REGEX', () => {
    expect(NICK_TAG_REGEX).toBeInstanceOf(RegExp);
    expect(NICK_TAG_REGEX.test('coder#3A7F')).toBe(true);
    expect(NICK_TAG_REGEX.test('invalid')).toBe(false);
  });
});

describe('FriendRecord type', () => {
  it('should satisfy the interface shape', () => {
    const record: FriendRecord = {
      nickname: 'coder',
      tag: '3A7F',
      addedAt: new Date().toISOString(),
    };
    expect(record.nickname).toBe('coder');
    expect(record.tag).toBe('3A7F');
    expect(typeof record.addedAt).toBe('string');
  });
});

describe('Friend Protocol Schemas', () => {
  describe('friendStatusRequestSchema', () => {
    it('should validate correct payload', () => {
      const result = friendStatusRequestSchema.safeParse({
        type: 'friend_status_request',
        friends: [{ nickname: 'coder', tag: '3A7F' }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty friends array', () => {
      const result = friendStatusRequestSchema.safeParse({
        type: 'friend_status_request',
        friends: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = friendStatusRequestSchema.safeParse({
        type: 'wrong',
        friends: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing friends field', () => {
      const result = friendStatusRequestSchema.safeParse({
        type: 'friend_status_request',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('friendStatusResponseSchema', () => {
    it('should validate correct payload with online status', () => {
      const result = friendStatusResponseSchema.safeParse({
        type: 'friend_status_response',
        statuses: [{ nickname: 'coder', tag: '3A7F', status: 'online' }],
      });
      expect(result.success).toBe(true);
    });

    it('should validate offline and unknown statuses', () => {
      const result = friendStatusResponseSchema.safeParse({
        type: 'friend_status_response',
        statuses: [
          { nickname: 'a', tag: 'AAAA', status: 'offline' },
          { nickname: 'b', tag: 'BBBB', status: 'unknown' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate with optional aiCli', () => {
      const result = friendStatusResponseSchema.safeParse({
        type: 'friend_status_response',
        statuses: [{ nickname: 'coder', tag: '3A7F', status: 'online', aiCli: 'Claude Code' }],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status value', () => {
      const result = friendStatusResponseSchema.safeParse({
        type: 'friend_status_response',
        statuses: [{ nickname: 'coder', tag: '3A7F', status: 'busy' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('friendStatusUpdateSchema', () => {
    it('should validate correct payload', () => {
      const result = friendStatusUpdateSchema.safeParse({
        type: 'friend_status_update',
        nickname: 'coder',
        tag: '3A7F',
        status: 'online',
      });
      expect(result.success).toBe(true);
    });

    it('should validate offline status', () => {
      const result = friendStatusUpdateSchema.safeParse({
        type: 'friend_status_update',
        nickname: 'coder',
        tag: '3A7F',
        status: 'offline',
      });
      expect(result.success).toBe(true);
    });

    it('should reject unknown status (only online/offline for updates)', () => {
      const result = friendStatusUpdateSchema.safeParse({
        type: 'friend_status_update',
        nickname: 'coder',
        tag: '3A7F',
        status: 'unknown',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing nickname', () => {
      const result = friendStatusUpdateSchema.safeParse({
        type: 'friend_status_update',
        tag: '3A7F',
        status: 'online',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Discriminated Unions', () => {
    it('should include friend_status_request in clientMessageSchema', () => {
      const result = clientMessageSchema.safeParse({
        type: 'friend_status_request',
        friends: [{ nickname: 'a', tag: 'AAAA' }],
      });
      expect(result.success).toBe(true);
    });

    it('should include friend_status_response in serverMessageSchema', () => {
      const result = serverMessageSchema.safeParse({
        type: 'friend_status_response',
        statuses: [{ nickname: 'a', tag: 'AAAA', status: 'online' }],
      });
      expect(result.success).toBe(true);
    });

    it('should include friend_status_update in serverMessageSchema', () => {
      const result = serverMessageSchema.safeParse({
        type: 'friend_status_update',
        nickname: 'a',
        tag: 'AAAA',
        status: 'offline',
      });
      expect(result.success).toBe(true);
    });
  });
});
