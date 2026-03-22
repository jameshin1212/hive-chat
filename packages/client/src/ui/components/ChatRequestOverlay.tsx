import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { NearbyUser } from '@hivechat/shared';
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
    <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
      <Box>
        <Text bold color="yellow">Chat request from </Text>
        <Text color={badgeColor}>[{from.aiCli}]</Text>
        <Text bold color="yellow"> {from.nickname}#{from.tag}</Text>
        <Text color={theme.text.secondary}> ({from.distance}km away)</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Text><Text bold color="green">[Enter]</Text> Accept</Text>
        <Text><Text bold color="red">[Esc]</Text> Decline</Text>
      </Box>
    </Box>
  );
}
