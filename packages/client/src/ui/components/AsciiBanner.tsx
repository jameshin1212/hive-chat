import React from 'react';
import { Text } from 'ink';
import figlet from 'figlet';
import { theme } from '../theme.js';
import type { Breakpoint } from '../../hooks/useTerminalSize.js';

// Generate ASCII art at module load time (not runtime)
let FIGLET_BANNER: string;
try {
  FIGLET_BANNER = figlet.textSync('HIVECHAT', { font: 'Standard' });
} catch {
  FIGLET_BANNER = '=== HIVECHAT ===';
}

const PLAIN_BANNER = '=== HIVECHAT ===';

interface AsciiBannerProps {
  breakpoint?: Breakpoint;
}

export function AsciiBanner({ breakpoint }: AsciiBannerProps) {
  const bannerText = breakpoint === 'compact' ? PLAIN_BANNER : FIGLET_BANNER;
  return <Text color={theme.text.primary}>{bannerText}</Text>;
}
