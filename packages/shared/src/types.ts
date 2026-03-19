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
