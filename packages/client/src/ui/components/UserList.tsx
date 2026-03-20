import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { NearbyUser } from '@hivechat/shared';
import { theme } from '../theme.js';

interface UserListProps {
  users: NearbyUser[];
  visible: boolean;
  onSelect: (user: NearbyUser) => void;
  onClose: () => void;
  maxVisible?: number;
}

export function UserList({ users, visible, onSelect, onClose, maxVisible = 8 }: UserListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp selectedIndex when users list changes
  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, users.length - 1)));
  }, [users.length]);

  useInput((_input, key) => {
    if (!visible) return;

    if (key.upArrow) {
      setSelectedIndex(prev => prev <= 0 ? users.length - 1 : prev - 1);
    } else if (key.downArrow) {
      setSelectedIndex(prev => prev >= users.length - 1 ? 0 : prev + 1);
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

  // Header (always visible)
  const header = (
    <>
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
    </>
  );

  const renderUser = (user: NearbyUser, index: number, isSelected: boolean) => {
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
  };

  // No scroll needed
  if (users.length <= maxVisible) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {header}
        {users.map((user, i) => renderUser(user, i, i === selectedIndex))}
      </Box>
    );
  }

  // Scroll window (stateless, centered on selectedIndex)
  const itemSlots = maxVisible - 2; // reserve 2 for indicators
  const half = Math.floor(itemSlots / 2);
  let start = Math.max(0, Math.min(selectedIndex - half, users.length - itemSlots));
  start = Math.max(0, start);
  const end = Math.min(start + itemSlots, users.length);
  const visible_items = users.slice(start, end);

  return (
    <Box flexDirection="column" paddingX={1}>
      {header}
      <Text dimColor>{start > 0 ? `  ↑ ${start} more` : ' '}</Text>
      {visible_items.map((user, i) => renderUser(user, start + i, start + i === selectedIndex))}
      <Text dimColor>{end < users.length ? `  ↓ ${users.length - end} more` : ' '}</Text>
    </Box>
  );
}
