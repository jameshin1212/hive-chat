import { z } from 'zod';
import { AI_CLI_OPTIONS } from './types.js';
import { MAX_CHAT_MESSAGE_LENGTH } from './constants.js';

export const MessageType = {
  // Client -> Server
  REGISTER: 'register',
  HEARTBEAT: 'heartbeat',
  GET_NEARBY: 'get_nearby',
  UPDATE_RADIUS: 'update_radius',
  // Client -> Server (chat)
  CHAT_REQUEST: 'chat_request',
  CHAT_ACCEPT: 'chat_accept',
  CHAT_DECLINE: 'chat_decline',
  CHAT_MESSAGE: 'chat_message',
  CHAT_LEAVE: 'chat_leave',
  // Server -> Client
  REGISTERED: 'registered',
  NEARBY_USERS: 'nearby_users',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_STATUS: 'user_status',
  ERROR: 'error',
  // Server -> Client (chat)
  CHAT_REQUESTED: 'chat_requested',
  CHAT_ACCEPTED: 'chat_accepted',
  CHAT_DECLINED: 'chat_declined',
  CHAT_MSG: 'chat_msg',
  CHAT_LEFT: 'chat_left',
  CHAT_USER_OFFLINE: 'chat_user_offline',
  CHAT_ERROR: 'chat_error',
  // Client -> Server (friends)
  FRIEND_STATUS_REQUEST: 'friend_status_request',
  // Server -> Client (friends)
  FRIEND_STATUS_RESPONSE: 'friend_status_response',
  FRIEND_STATUS_UPDATE: 'friend_status_update',
  // Bidirectional (P2P)
  P2P_SIGNAL: 'p2p_signal',
  // Client -> Server (P2P)
  P2P_STATUS: 'p2p_status',
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

// --- Client -> Server chat schemas ---

const uuidSchema = z.string().uuid();

export const chatRequestSchema = z.object({
  type: z.literal(MessageType.CHAT_REQUEST),
  targetNickname: z.string().min(1).max(16),
  targetTag: z.string().regex(/^[0-9A-F]{4}$/),
});

export const chatAcceptSchema = z.object({
  type: z.literal(MessageType.CHAT_ACCEPT),
  sessionId: uuidSchema,
});

export const chatDeclineSchema = z.object({
  type: z.literal(MessageType.CHAT_DECLINE),
  sessionId: uuidSchema,
});

export const chatMessageSchema = z.object({
  type: z.literal(MessageType.CHAT_MESSAGE),
  sessionId: uuidSchema,
  content: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

export const chatLeaveSchema = z.object({
  type: z.literal(MessageType.CHAT_LEAVE),
  sessionId: uuidSchema,
});

// --- Client -> Server friend schemas ---

export const friendStatusRequestSchema = z.object({
  type: z.literal(MessageType.FRIEND_STATUS_REQUEST),
  friends: z.array(z.object({
    nickname: z.string().min(1).max(16),
    tag: z.string().regex(/^[0-9A-F]{4}$/),
  })).max(100),
});

// --- Bidirectional P2P schemas ---

export const p2pSignalSchema = z.object({
  type: z.literal(MessageType.P2P_SIGNAL),
  sessionId: uuidSchema,
  topic: z.string().regex(/^[0-9a-f]{64}$/), // 32-byte hex-encoded Hyperswarm topic
});

export const p2pStatusSchema = z.object({
  type: z.literal(MessageType.P2P_STATUS),
  sessionId: uuidSchema,
  transportType: z.enum(['relay', 'direct']),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  registerSchema,
  heartbeatSchema,
  getNearbySchema,
  updateRadiusSchema,
  chatRequestSchema,
  chatAcceptSchema,
  chatDeclineSchema,
  chatMessageSchema,
  chatLeaveSchema,
  friendStatusRequestSchema,
  p2pSignalSchema,
  p2pStatusSchema,
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

// --- Server -> Client chat schemas ---

export const chatRequestedSchema = z.object({
  type: z.literal(MessageType.CHAT_REQUESTED),
  sessionId: uuidSchema,
  from: nearbyUserSchema,
});

export const chatAcceptedSchema = z.object({
  type: z.literal(MessageType.CHAT_ACCEPTED),
  sessionId: uuidSchema,
  partner: nearbyUserSchema,
});

export const chatDeclinedSchema = z.object({
  type: z.literal(MessageType.CHAT_DECLINED),
  sessionId: uuidSchema,
});

export const chatMsgSchema = z.object({
  type: z.literal(MessageType.CHAT_MSG),
  sessionId: uuidSchema,
  from: z.object({ nickname: z.string(), tag: z.string() }),
  content: z.string(),
  timestamp: z.number(),
});

export const chatLeftSchema = z.object({
  type: z.literal(MessageType.CHAT_LEFT),
  sessionId: uuidSchema,
  nickname: z.string(),
  tag: z.string(),
});

export const chatUserOfflineSchema = z.object({
  type: z.literal(MessageType.CHAT_USER_OFFLINE),
  nickname: z.string(),
  tag: z.string(),
});

export const chatErrorSchema = z.object({
  type: z.literal(MessageType.CHAT_ERROR),
  code: z.string(),
  message: z.string(),
});

// --- Server -> Client friend schemas ---

export const friendStatusResponseSchema = z.object({
  type: z.literal(MessageType.FRIEND_STATUS_RESPONSE),
  statuses: z.array(z.object({
    nickname: z.string(),
    tag: z.string(),
    status: z.enum(['online', 'offline', 'unknown']),
    aiCli: z.enum(AI_CLI_OPTIONS).optional(),
  })),
});

export const friendStatusUpdateSchema = z.object({
  type: z.literal(MessageType.FRIEND_STATUS_UPDATE),
  nickname: z.string(),
  tag: z.string(),
  status: z.enum(['online', 'offline']),
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  registeredSchema,
  nearbyUsersResponseSchema,
  userJoinedSchema,
  userLeftSchema,
  userStatusSchema,
  errorSchema,
  chatRequestedSchema,
  chatAcceptedSchema,
  chatDeclinedSchema,
  chatMsgSchema,
  chatLeftSchema,
  chatUserOfflineSchema,
  chatErrorSchema,
  friendStatusResponseSchema,
  friendStatusUpdateSchema,
  p2pSignalSchema,
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

// Chat message types
export type ChatRequestMessage = z.infer<typeof chatRequestSchema>;
export type ChatAcceptMessage = z.infer<typeof chatAcceptSchema>;
export type ChatDeclineMessage = z.infer<typeof chatDeclineSchema>;
export type ChatMessageMessage = z.infer<typeof chatMessageSchema>;
export type ChatLeaveMessage = z.infer<typeof chatLeaveSchema>;
export type ChatRequestedMessage = z.infer<typeof chatRequestedSchema>;
export type ChatAcceptedMessage = z.infer<typeof chatAcceptedSchema>;
export type ChatDeclinedMessage = z.infer<typeof chatDeclinedSchema>;
export type ChatMsgMessage = z.infer<typeof chatMsgSchema>;
export type ChatLeftMessage = z.infer<typeof chatLeftSchema>;
export type ChatUserOfflineMessage = z.infer<typeof chatUserOfflineSchema>;
export type ChatErrorMessage = z.infer<typeof chatErrorSchema>;

// Friend message types
export type FriendStatusRequestMessage = z.infer<typeof friendStatusRequestSchema>;
export type FriendStatusResponseMessage = z.infer<typeof friendStatusResponseSchema>;
export type FriendStatusUpdateMessage = z.infer<typeof friendStatusUpdateSchema>;

// P2P message types
export type P2PSignalMessage = z.infer<typeof p2pSignalSchema>;
export type P2PStatusMessage = z.infer<typeof p2pStatusSchema>;
