export const AI_CLI_OPTIONS = ['Claude Code', 'Codex', 'Gemini', 'Cursor'] as const;
export type AiCli = (typeof AI_CLI_OPTIONS)[number];

export interface Identity {
  nickname: string;
  tag: string; // 4-char uppercase hex, e.g. "3A7F"
  aiCli: AiCli;
  schemaVersion: 1;
}

export interface ChatMessage {
  id: string;
  from: Identity;
  content: string;
  timestamp: number;
}

export type SlashCommand = {
  type: 'command';
  name: string;
  args: string[];
};

export type ParsedInput =
  | SlashCommand
  | { type: 'message'; content: string };

export type ChatSessionStatus = 'idle' | 'requesting' | 'active' | 'disconnected';

// --- Friend types ---

export const NICK_TAG_REGEX = /^(.+)#([0-9A-F]{4})$/;

export function parseNickTag(input: string): { nickname: string; tag: string } | null {
  const match = NICK_TAG_REGEX.exec(input);
  if (!match) return null;
  return { nickname: match[1]!, tag: match[2]! };
}

// --- P2P types ---

export type TransportType = 'relay' | 'direct';

export interface FriendRecord {
  nickname: string;
  tag: string;
  addedAt: string; // ISO 8601
}
