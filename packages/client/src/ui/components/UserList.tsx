import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { NearbyUser } from '@cling-talk/shared';
import { theme } from '../theme.js';

interface UserListProps {
  users: NearbyUser[];
  visible: boolean;
  onSelect: (user: NearbyUser) => void;
  onClose: () => void;
}

export function UserList({ users, visible, onSelect, onClose }: UserListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_input, key) => {
    if (!visible) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(users.length - 1, prev + 1));
    } else if (key.return && users.length > 0) {
      onSelect(users[selectedIndex]!);
    } else if (key.escape) {
      onClose();
    }
  }, { isActive: visible });

  if (!visible) return null;

  if (users.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color={theme.text.secondary}>No users nearby. Try expanding radius</Text>
        <Text color={theme.text.secondary} dimColor>(Press Escape to close, Tab to expand radius)</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.text.primary}>Nearby Users</Text>
        <Text color={theme.text.secondary}> (Esc to close, Enter to select)</Text>
      </Box>
      <Box>
        <Text color={theme.text.secondary}>
          {'  nick#tag            AI CLI         dist   status'}
        </Text>
      </Box>
      <Box>
        <Text color={theme.text.secondary}>
          {'  ─────────────────── ────────────── ────── ──────'}
        </Text>
      </Box>
      {users.map((user, index) => {
        const isSelected = index === selectedIndex;
        const nameDisplay = `${user.nickname}#${user.tag}`.padEnd(19);
        const cliDisplay = user.aiCli.padEnd(14);
        const distDisplay = `${user.distance}km`.padEnd(6);
        const statusColor = user.status === 'online' ? 'green' : 'gray';

        return (
          <Box key={`${user.nickname}-${user.tag}`}>
            <Text inverse={isSelected}>
              {isSelected ? '> ' : '  '}
              {nameDisplay} {cliDisplay} {distDisplay} </Text>
            <Text inverse={isSelected} color={statusColor}>{user.status}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
