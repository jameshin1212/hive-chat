import React from 'react';
import { Box, Text } from 'ink';
import type { Identity } from '@cling-talk/shared';
import { theme } from '../theme.js';

interface StatusBarProps {
  identity: Identity;
}

export function StatusBar({ identity }: StatusBarProps) {
  const badgeColor = theme.badge[identity.aiCli];

  return (
    <Box>
      <Text color={badgeColor}>[{identity.aiCli}]</Text>
      <Text color={theme.text.primary}> {identity.nickname}#{identity.tag}</Text>
      <Text color={theme.text.secondary}> | </Text>
      <Text color="yellow">offline</Text>
    </Box>
  );
}
