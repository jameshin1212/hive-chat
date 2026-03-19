import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { FriendStatus } from '../../hooks/useFriends.js';
import { theme } from '../theme.js';

interface FriendListProps {
  friends: FriendStatus[];
  visible: boolean;
  onSelect: (friend: FriendStatus) => void;
  onClose: () => void;
}

export function FriendList({ friends, visible, onSelect, onClose }: FriendListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort: online first, then alphabetical within each group
  const sorted = [...friends].sort((a, b) => {
    const aOnline = a.status === 'online' ? 0 : 1;
    const bOnline = b.status === 'online' ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return `${a.nickname}#${a.tag}`.localeCompare(`${b.nickname}#${b.tag}`);
  });

  useInput((_input, key) => {
    if (!visible) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(sorted.length - 1, prev + 1));
    } else if (key.return && sorted.length > 0) {
      onSelect(sorted[selectedIndex]!);
    } else if (key.escape) {
      onClose();
    }
  }, { isActive: visible });

  if (!visible) return null;

  if (sorted.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color={theme.text.secondary}>No friends yet. Use /addfriend nick#tag</Text>
        <Text color={theme.text.secondary} dimColor>(Press Escape to close)</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.text.primary}>Friends</Text>
        <Text color={theme.text.secondary}> (Esc to close, Enter to chat)</Text>
      </Box>
      <Box>
        <Text color={theme.text.secondary}>
          {'  nick#tag            AI CLI         status'}
        </Text>
      </Box>
      <Box>
        <Text color={theme.text.secondary}>
          {'  ─────────────────── ────────────── ──────'}
        </Text>
      </Box>
      {sorted.map((friend, index) => {
        const isSelected = index === selectedIndex;
        const nameDisplay = `${friend.nickname}#${friend.tag}`.padEnd(19);
        const cliDisplay = (friend.aiCli ?? '').padEnd(14);
        const statusColor = friend.status === 'online' ? 'green' : 'gray';

        return (
          <Box key={`${friend.nickname}-${friend.tag}`}>
            <Text inverse={isSelected}>
              {isSelected ? '> ' : '  '}
              {nameDisplay} {cliDisplay} </Text>
            <Text inverse={isSelected} color={statusColor}>{friend.status}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
