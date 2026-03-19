import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { FriendStatus } from '../../hooks/useFriends.js';
import { theme } from '../theme.js';

interface FriendListProps {
  friends: FriendStatus[];
  visible: boolean;
  onSelect: (friend: FriendStatus) => void;
  onClose: () => void;
  maxVisible?: number;
}

export function FriendList({ friends, visible, onSelect, onClose, maxVisible = 8 }: FriendListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort: online first, then alphabetical within each group
  const sorted = [...friends].sort((a, b) => {
    const aOnline = a.status === 'online' ? 0 : 1;
    const bOnline = b.status === 'online' ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return `${a.nickname}#${a.tag}`.localeCompare(`${b.nickname}#${b.tag}`);
  });

  // Clamp selectedIndex when friends list changes
  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, sorted.length - 1)));
  }, [sorted.length]);

  useInput((_input, key) => {
    if (!visible) return;

    if (key.upArrow) {
      setSelectedIndex(prev => prev <= 0 ? sorted.length - 1 : prev - 1);
    } else if (key.downArrow) {
      setSelectedIndex(prev => prev >= sorted.length - 1 ? 0 : prev + 1);
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

  const header = (
    <>
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
    </>
  );

  const renderFriend = (friend: FriendStatus, index: number, isSelected: boolean) => {
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
  };

  // No scroll needed
  if (sorted.length <= maxVisible) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {header}
        {sorted.map((friend, i) => renderFriend(friend, i, i === selectedIndex))}
      </Box>
    );
  }

  // Scroll window
  const itemSlots = maxVisible - 2;
  const half = Math.floor(itemSlots / 2);
  let start = Math.max(0, Math.min(selectedIndex - half, sorted.length - itemSlots));
  start = Math.max(0, start);
  const end = Math.min(start + itemSlots, sorted.length);
  const visible_items = sorted.slice(start, end);

  return (
    <Box flexDirection="column" paddingX={1}>
      {header}
      <Text dimColor>{start > 0 ? `  ↑ ${start} more` : ' '}</Text>
      {visible_items.map((friend, i) => renderFriend(friend, start + i, start + i === selectedIndex))}
      <Text dimColor>{end < sorted.length ? `  ↓ ${sorted.length - end} more` : ' '}</Text>
    </Box>
  );
}
