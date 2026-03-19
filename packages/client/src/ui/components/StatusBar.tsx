import React from 'react';
import { Box, Text } from 'ink';
import type { Identity } from '@cling-talk/shared';
import type { ConnectionStatus } from '../../hooks/useServerConnection.js';
import { theme } from '../theme.js';

interface StatusBarProps {
  identity: Identity;
  connectionStatus: ConnectionStatus;
  radiusKm: number;
  nearbyCount: number;
  chatInfo?: string;
}

function connectionColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'green';
    case 'connecting':
    case 'reconnecting':
      return 'yellow';
    case 'offline':
      return 'red';
  }
}

function connectionLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'connecting':
      return 'connecting...';
    case 'reconnecting':
      return 'reconnecting...';
    case 'offline':
      return 'offline';
  }
}

export function StatusBar({ identity, connectionStatus, radiusKm, nearbyCount, chatInfo }: StatusBarProps) {
  const badgeColor = theme.badge[identity.aiCli];

  return (
    <Box>
      <Text color={badgeColor}>[{identity.aiCli}]</Text>
      <Text color={theme.text.primary}> {identity.nickname}#{identity.tag}</Text>
      <Text color={theme.text.secondary}> | </Text>
      <Text color={connectionColor(connectionStatus)}>{connectionLabel(connectionStatus)}</Text>
      <Text color={theme.text.secondary}> | </Text>
      <Text color={theme.text.secondary}>{radiusKm}km</Text>
      <Text color={theme.text.secondary}> | </Text>
      <Text color={theme.text.secondary}>{nearbyCount} nearby</Text>
      {chatInfo && (
        <>
          <Text color={theme.text.secondary}> | </Text>
          <Text color={theme.text.info}>{chatInfo}</Text>
        </>
      )}
    </Box>
  );
}
