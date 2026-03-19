import { USER_COLORS, THEME_COLORS } from '@cling-talk/shared';

export const theme = {
  text: {
    primary: THEME_COLORS.primary,     // green
    secondary: 'gray',
    error: 'red',
    info: 'cyan',
  },
  ui: {
    separator: THEME_COLORS.separator,  // green
    statusBar: THEME_COLORS.statusBar,  // green
    prompt: 'green',
    transition: 'green',
  },
  badge: {
    'Claude Code': '#B87FFF',
    'Codex': '#10A37F',
    'Gemini': '#4285F4',
    'Cursor': '#00D4AA',
  } as const,
} as const;

export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length]!;
}

export { USER_COLORS };
