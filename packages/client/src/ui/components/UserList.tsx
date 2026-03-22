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

    // Empty list: any key closes
    if (users.length === 0) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => prev <= 0 ? users.length - 1 : prev - 1);
    } else if (key.downArrow) {
      setSelectedIndex(prev => prev >= users.length - 1 ? 0 : prev + 1);
    } else if (key.return) {
      onSelect(users[selectedIndex]!);
    } else if (key.escape) {
      onClose();
    }
  }, { isActive: visible });

  if (!visible) return null;

  if (users.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1} flexShrink={0}>
        <Text color={theme.text.primary}>No users nearby.</Text>
        <Text color={theme.text.secondary}>(Press any key to close)</Text>
      </Box>
    );
  }

  const renderUser = (user: NearbyUser, index: number, isSelected: boolean) => {
    const nameDisplay = `${user.nickname}#${user.tag}`.padEnd(19);
    const cliDisplay = user.aiCli.padEnd(14);
    const distDisplay = `${user.distance}km`.padEnd(6);
    const statusColor = user.status === 'online' ? 'green' : 'gray';

    return (
      <Box key={`${user.nickname}-${user.tag}`}>
        <Text inverse={isSelected} bold={isSelected}>
          {isSelected ? '> ' : '  '}
          {nameDisplay} {cliDisplay} {distDisplay} </Text>
        <Text inverse={isSelected} color={statusColor}>{user.status}</Text>
      </Box>
    );
  };

  // No scroll needed
  if (users.length <= maxVisible) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1} flexShrink={0}>
        <Box marginBottom={0}>
          <Text bold color={theme.text.primary}>Nearby Users</Text>
          <Text color={theme.text.secondary}> (Esc to close, Enter to select)</Text>
        </Box>
        {users.map((user, i) => renderUser(user, i, i === selectedIndex))}
      </Box>
    );
  }

  // Scroll window
  const itemSlots = maxVisible - 2;
  const half = Math.floor(itemSlots / 2);
  let start = Math.max(0, Math.min(selectedIndex - half, users.length - itemSlots));
  start = Math.max(0, start);
  const end = Math.min(start + itemSlots, users.length);
  const visible_items = users.slice(start, end);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1} flexShrink={0}>
      <Box marginBottom={0}>
        <Text bold color={theme.text.primary}>Nearby Users</Text>
        <Text color={theme.text.secondary}> (Esc to close, Enter to select)</Text>
      </Box>
      <Text dimColor>{start > 0 ? `  \u2191 ${start} more` : ' '}</Text>
      {visible_items.map((user, i) => renderUser(user, start + i, start + i === selectedIndex))}
      <Text dimColor>{end < users.length ? `  \u2193 ${users.length - end} more` : ' '}</Text>
    </Box>
  );
}
