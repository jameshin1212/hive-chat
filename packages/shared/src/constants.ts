export const NICKNAME_REGEX = /^[a-z0-9_-]{1,16}$/;
export const TAG_LENGTH = 4;
export const MAX_MESSAGES = 500;
export const MIN_TERMINAL_WIDTH = 60;
export const DEFAULT_TERMINAL_WIDTH = 80;

export const THEME_COLORS = {
  primary: 'green',
  separator: 'green',
  statusBar: 'green',
} as const;

export const USER_COLORS = [
  'white', 'yellow', 'red', '#FF69B4', '#FF1493', 'magenta', '#FFA500',
] as const;
