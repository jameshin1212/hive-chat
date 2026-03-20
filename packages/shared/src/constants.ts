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

// Server constants
export const DEFAULT_SERVER_PORT = 3456;
export const DEFAULT_SERVER_URL = 'wss://hivechat-signal.fly.dev';
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const STALE_TIMEOUT_MS = 60_000;
export const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
export const DEFAULT_RADIUS_KM = 3;
export const RECONNECT_BASE_DELAY_MS = 500;
export const RECONNECT_MAX_DELAY_MS = 30_000;
export const PROTOCOL_VERSION = 1;

// Chat constants
export const CHAT_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_CHAT_MESSAGE_LENGTH = 2000;

// P2P constants
export const P2P_UPGRADE_TIMEOUT_MS = 3_000;
