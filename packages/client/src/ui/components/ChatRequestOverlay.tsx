import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { NearbyUser } from '@cling-talk/shared';
import { theme } from '../theme.js';

interface ChatRequestOverlayProps {
  request: { sessionId: string; from: NearbyUser } | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function ChatRequestOverlay({ request, onAccept, onDecline }: ChatRequestOverlayProps) {
  useInput((_input, key) => {
    if (key.return) {
      onAccept();
    } else if (key.escape) {
      onDecline();
    }
  }, { isActive: request !== null });

  if (!request) return null;

  const { from } = request;
  const badgeColor = theme.badge[from.aiCli];

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <Text color={theme.text.info}>Chat request from </Text>
        <Text color={badgeColor}>[{from.aiCli}]</Text>
        <Text color={theme.text.info}> {from.nickname}#{from.tag}</Text>
        <Text color={theme.text.secondary}> ({from.distance}km away)</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>Enter to accept, Escape to decline</Text>
      </Box>
    </Box>
  );
}
