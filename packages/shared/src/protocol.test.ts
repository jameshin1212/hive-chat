import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  heartbeatSchema,
  getNearbySchema,
  updateRadiusSchema,
  nearbyUsersResponseSchema,
  registeredSchema,
  userJoinedSchema,
  userLeftSchema,
  userStatusSchema,
  errorSchema,
  clientMessageSchema,
  serverMessageSchema,
  MessageType,
} from './protocol.js';

describe('Protocol schemas', () => {
  describe('registerSchema', () => {
    it('validates a correct register message', () => {
      const msg = {
        type: 'register',
        nickname: 'dev-user',
        tag: '3A7F',
        aiCli: 'Claude Code',
        protocolVersion: 1,
      };
      expect(registerSchema.parse(msg)).toEqual(msg);
    });

    it('rejects register with missing fields', () => {
      expect(() => registerSchema.parse({ type: 'register' })).toThrow();
    });

    it('rejects register with invalid nickname', () => {
      expect(() =>
        registerSchema.parse({
          type: 'register',
          nickname: 'INVALID NICK!',
          tag: '3A7F',
          aiCli: 'Claude Code',
          protocolVersion: 1,
        }),
      ).toThrow();
    });

    it('rejects register with invalid tag', () => {
      expect(() =>
        registerSchema.parse({
          type: 'register',
          nickname: 'dev',
          tag: 'zzzz',
          aiCli: 'Claude Code',
          protocolVersion: 1,
        }),
      ).toThrow();
    });

    it('rejects register with wrong protocolVersion', () => {
      expect(() =>
        registerSchema.parse({
          type: 'register',
          nickname: 'dev',
          tag: '3A7F',
          aiCli: 'Claude Code',
          protocolVersion: 2,
        }),
      ).toThrow();
    });
  });

  describe('heartbeatSchema', () => {
    it('validates a heartbeat message', () => {
      const msg = { type: 'heartbeat' };
      expect(heartbeatSchema.parse(msg)).toEqual(msg);
    });

    it('rejects heartbeat with extra unknown type', () => {
      expect(() => heartbeatSchema.parse({ type: 'ping' })).toThrow();
    });
  });

  describe('getNearbySchema', () => {
    it('validates radiusKm within 1-10', () => {
      expect(getNearbySchema.parse({ type: 'get_nearby', radiusKm: 1 })).toBeTruthy();
      expect(getNearbySchema.parse({ type: 'get_nearby', radiusKm: 5 })).toBeTruthy();
      expect(getNearbySchema.parse({ type: 'get_nearby', radiusKm: 10 })).toBeTruthy();
    });

    it('rejects radiusKm of 0', () => {
      expect(() => getNearbySchema.parse({ type: 'get_nearby', radiusKm: 0 })).toThrow();
    });

    it('rejects radiusKm of 11', () => {
      expect(() => getNearbySchema.parse({ type: 'get_nearby', radiusKm: 11 })).toThrow();
    });

    it('rejects non-integer radiusKm', () => {
      expect(() => getNearbySchema.parse({ type: 'get_nearby', radiusKm: 2.5 })).toThrow();
    });
  });

  describe('updateRadiusSchema', () => {
    it('validates radiusKm within 1-10', () => {
      expect(updateRadiusSchema.parse({ type: 'update_radius', radiusKm: 3 })).toBeTruthy();
    });

    it('rejects out of range', () => {
      expect(() => updateRadiusSchema.parse({ type: 'update_radius', radiusKm: 0 })).toThrow();
    });
  });

  describe('nearbyUsersResponseSchema', () => {
    it('validates response with users array', () => {
      const msg = {
        type: 'nearby_users',
        users: [
          { nickname: 'alice', tag: 'ABCD', aiCli: 'Cursor', distance: 1.2, status: 'online' },
          { nickname: 'bob', tag: '1234', aiCli: 'Gemini', distance: 3.5, status: 'offline' },
        ],
      };
      expect(nearbyUsersResponseSchema.parse(msg)).toEqual(msg);
    });

    it('validates response with empty users array', () => {
      expect(nearbyUsersResponseSchema.parse({ type: 'nearby_users', users: [] })).toBeTruthy();
    });
  });

  describe('registeredSchema', () => {
    it('validates registered response with users', () => {
      const msg = {
        type: 'registered',
        users: [{ nickname: 'alice', tag: 'ABCD', aiCli: 'Codex', distance: 0.5, status: 'online' }],
      };
      expect(registeredSchema.parse(msg)).toEqual(msg);
    });
  });

  describe('userJoinedSchema', () => {
    it('validates user_joined event', () => {
      const msg = {
        type: 'user_joined',
        user: { nickname: 'alice', tag: 'ABCD', aiCli: 'Claude Code', distance: 2.0, status: 'online' },
      };
      expect(userJoinedSchema.parse(msg)).toEqual(msg);
    });
  });

  describe('userLeftSchema', () => {
    it('validates user_left event', () => {
      const msg = { type: 'user_left', nickname: 'alice', tag: 'ABCD' };
      expect(userLeftSchema.parse(msg)).toEqual(msg);
    });
  });

  describe('userStatusSchema', () => {
    it('validates user_status event', () => {
      const msg = { type: 'user_status', nickname: 'alice', tag: 'ABCD', status: 'offline' };
      expect(userStatusSchema.parse(msg)).toEqual(msg);
    });

    it('rejects invalid status', () => {
      expect(() =>
        userStatusSchema.parse({ type: 'user_status', nickname: 'a', tag: 'ABCD', status: 'away' }),
      ).toThrow();
    });
  });

  describe('errorSchema', () => {
    it('validates error message', () => {
      const msg = { type: 'error', code: 'INVALID_MESSAGE', message: 'Bad format' };
      expect(errorSchema.parse(msg)).toEqual(msg);
    });
  });

  describe('clientMessageSchema (discriminated union)', () => {
    it('parses register message by type', () => {
      const msg = {
        type: 'register',
        nickname: 'dev',
        tag: '1234',
        aiCli: 'Cursor',
        protocolVersion: 1,
      };
      const parsed = clientMessageSchema.parse(msg);
      expect(parsed.type).toBe(MessageType.REGISTER);
    });

    it('parses heartbeat message by type', () => {
      const parsed = clientMessageSchema.parse({ type: 'heartbeat' });
      expect(parsed.type).toBe(MessageType.HEARTBEAT);
    });

    it('parses get_nearby message by type', () => {
      const parsed = clientMessageSchema.parse({ type: 'get_nearby', radiusKm: 5 });
      expect(parsed.type).toBe(MessageType.GET_NEARBY);
    });

    it('rejects unknown type', () => {
      expect(() => clientMessageSchema.parse({ type: 'unknown_type' })).toThrow();
    });
  });

  describe('serverMessageSchema (discriminated union)', () => {
    it('parses nearby_users response by type', () => {
      const parsed = serverMessageSchema.parse({ type: 'nearby_users', users: [] });
      expect(parsed.type).toBe(MessageType.NEARBY_USERS);
    });

    it('parses error message by type', () => {
      const parsed = serverMessageSchema.parse({
        type: 'error',
        code: 'AUTH_FAILED',
        message: 'Not registered',
      });
      expect(parsed.type).toBe(MessageType.ERROR);
    });

    it('rejects unknown server message type', () => {
      expect(() => serverMessageSchema.parse({ type: 'unknown' })).toThrow();
    });
  });
});
