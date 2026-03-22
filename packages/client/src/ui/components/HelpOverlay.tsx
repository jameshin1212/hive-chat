import React from 'react';
import { Box, Text, useInput } from 'ink';
import { COMMANDS } from '../../commands/CommandParser.js';
import { theme } from '../theme.js';

interface HelpOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpOverlay({ visible, onClose }: HelpOverlayProps) {
  useInput((_input, key) => {
    if (!visible) return;
    if (key.escape || key.return) {
      onClose();
    }
  }, { isActive: visible });

  if (!visible) return null;

  const maxNameWidth = Math.max(...Object.keys(COMMANDS).map(k => k.length));

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1} flexShrink={0}>
      <Box marginBottom={0}>
        <Text bold color={theme.text.primary}>Commands</Text>
        <Text color={theme.text.secondary}> (Esc to close)</Text>
      </Box>
      {Object.entries(COMMANDS).map(([name, info]) => (
        <Box key={name}>
          <Text color={theme.text.primary}>  {name.padEnd(maxNameWidth)}</Text>
          <Text dimColor>  {info.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text color={theme.text.secondary}>  Tab        Show nearby users</Text>
      <Text color={theme.text.secondary}>  Ctrl+C     Exit HiveChat</Text>
    </Box>
  );
}
