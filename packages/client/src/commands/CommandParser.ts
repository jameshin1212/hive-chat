import type { ParsedInput } from '@cling-talk/shared';

export const COMMANDS = {
  '/exit': { description: 'Exit Cling Talk' },
  '/users': { description: 'Show nearby users' },
  '/friends': { description: 'Show friend list' },
  '/chat': { description: 'Start chat with user' },
  '/radius': { description: 'Cycle discovery radius (1/3/5/10km)' },
  '/settings': { description: 'Open settings' },
  '/help': { description: 'Show available commands' },
  '/leave': { description: 'Leave current chat' },
  '/addfriend': { description: 'Add friend by nick#tag' },
  '/removefriend': { description: 'Remove friend by nick#tag' },
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

export function filterCommands(prefix: string): Array<{ name: string; description: string }> {
  return Object.entries(COMMANDS)
    .filter(([name]) => name.startsWith(prefix))
    .map(([name, info]) => ({ name, description: info.description }));
}

export function isKnownCommand(name: string): name is CommandName {
  return name in COMMANDS;
}
