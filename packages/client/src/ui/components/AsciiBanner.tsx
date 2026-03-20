import React from 'react';
import { Text } from 'ink';
import figlet from 'figlet';
import { theme } from '../theme.js';

// Generate ASCII art at module load time (not runtime)
let BANNER_TEXT: string;
try {
  BANNER_TEXT = figlet.textSync('HIVECHAT', { font: 'Standard' });
} catch {
  BANNER_TEXT = '=== HIVECHAT ===';
}

export function AsciiBanner() {
  return <Text color={theme.text.primary}>{BANNER_TEXT}</Text>;
}
