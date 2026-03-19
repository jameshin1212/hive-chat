import { z } from 'zod';
import { AI_CLI_OPTIONS } from './types.js';

export const MessageType = {
  // Client -> Server
  REGISTER: 'register',
  HEARTBEAT: 'heartbeat',
  GET_NEARBY: 'get_nearby',
  UPDATE_RADIUS: 'update_radius',
  // Server -> Client
  REGISTERED: 'registered',
  NEARBY_USERS: 'nearby_users',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_STATUS: 'user_status',
  ERROR: 'error',
} as const;

// --- Shared sub-schemas ---

export const nearbyUserSchema = z.object({
  nickname: z.string(),
  tag: z.string(),
  aiCli: z.enum(AI_CLI_OPTIONS),
  distance: z.number(),
  status: z.enum(['online', 'offline']),
});

export type NearbyUser = z.infer<typeof nearbyUserSchema>;

// --- Client -> Server schemas ---

export const registerSchema = z.object({
  type: z.literal(MessageType.REGISTER),
  nickname: z.string().regex(/^[a-z0-9_-]{1,16}$/),
  tag: z.string().regex(/^[0-9A-F]{4}$/),
  aiCli: z.enum(AI_CLI_OPTIONS),
  protocolVersion: z.literal(1),
});

export const heartbeatSchema = z.object({
  type: z.literal(MessageType.HEARTBEAT),
});

export const getNearbySchema = z.object({
  type: z.literal(MessageType.GET_NEARBY),
  radiusKm: z.number().int().min(1).max(10),
});

export const updateRadiusSchema = z.object({
  type: z.literal(MessageType.UPDATE_RADIUS),
  radiusKm: z.number().int().min(1).max(10),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  registerSchema,
  heartbeatSchema,
  getNearbySchema,
  updateRadiusSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// --- Server -> Client schemas ---

export const registeredSchema = z.object({
  type: z.literal(MessageType.REGISTERED),
  users: z.array(nearbyUserSchema),
});

export const nearbyUsersResponseSchema = z.object({
  type: z.literal(MessageType.NEARBY_USERS),
  users: z.array(nearbyUserSchema),
});

export const userJoinedSchema = z.object({
  type: z.literal(MessageType.USER_JOINED),
  user: nearbyUserSchema,
});

export const userLeftSchema = z.object({
  type: z.literal(MessageType.USER_LEFT),
  nickname: z.string(),
  tag: z.string(),
});

export const userStatusSchema = z.object({
  type: z.literal(MessageType.USER_STATUS),
  nickname: z.string(),
  tag: z.string(),
  status: z.enum(['online', 'offline']),
});

export const errorSchema = z.object({
  type: z.literal(MessageType.ERROR),
  code: z.string(),
  message: z.string(),
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  registeredSchema,
  nearbyUsersResponseSchema,
  userJoinedSchema,
  userLeftSchema,
  userStatusSchema,
  errorSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

// Re-export inferred types for individual schemas
export type RegisterMessage = z.infer<typeof registerSchema>;
export type HeartbeatMessage = z.infer<typeof heartbeatSchema>;
export type GetNearbyMessage = z.infer<typeof getNearbySchema>;
export type UpdateRadiusMessage = z.infer<typeof updateRadiusSchema>;
export type RegisteredMessage = z.infer<typeof registeredSchema>;
export type NearbyUsersResponse = z.infer<typeof nearbyUsersResponseSchema>;
export type UserJoinedMessage = z.infer<typeof userJoinedSchema>;
export type UserLeftMessage = z.infer<typeof userLeftSchema>;
export type UserStatusMessage = z.infer<typeof userStatusSchema>;
export type ErrorMessage = z.infer<typeof errorSchema>;
