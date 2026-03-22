import React from 'react';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import { theme } from '../theme.js';

interface TransitionLineProps {
  text: string;
  columns: number;
  color?: string;
}

const LINE_CHAR = '\u2550'; // ═ (double horizontal line)

/**
 * Decorative section divider for major state transitions.
 * Renders as: ═══════ text ═══════
 * Visually distinct from system messages (─ text ─).
 */
export function TransitionLine({ text, columns, color }: TransitionLineProps) {
  const textW = stringWidth(text);
  const padding = 2; // spaces around text
  const available = columns - textW - padding * 2;
  const sideLen = Math.max(2, Math.floor(available / 2));
  const leftLine = LINE_CHAR.repeat(sideLen);
  const rightLine = LINE_CHAR.repeat(sideLen);

  return (
    <Box>
      <Text color={color ?? theme.ui.transition}>
        {leftLine} {text} {rightLine}
      </Text>
    </Box>
  );
}
