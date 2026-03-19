import type { ParsedInput } from '@cling-talk/shared';

export const COMMANDS = {
  '/quit': { description: 'Exit Cling Talk' },
  '/users': { description: 'Show nearby users' },
  '/friends': { description: 'Show friend list' },
  '/chat': { description: 'Start chat with user' },
  '/settings': { description: 'Open settings' },
  '/help': { description: 'Show available commands' },
} as const;

export type CommandName = keyof typeof COMMANDS;

export function parseInput(input: string): ParsedInput {
  const trimmed = input.trim();
  if (trimmed.startsWith('/')) {
    const [name, ...args] = trimmed.split(' ');
    if (name && name in COMMANDS) {
      return { type: 'command', name, args };
    }
    // Unknown command — still parse as command for error handling
    return { type: 'command', name: name ?? '', args };
  }
  return { type: 'message', content: trimmed };
}

export function isKnownCommand(name: string): name is CommandName {
  return name in COMMANDS;
}
