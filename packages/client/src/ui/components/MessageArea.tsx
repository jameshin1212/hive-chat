import React from 'react';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import type { ChatMessage } from '@cling-talk/shared';
import { MAX_MESSAGES } from '@cling-talk/shared';
import { theme, getUserColor } from '../theme.js';

interface MessageAreaProps {
  messages: ChatMessage[];
}

// Track unique senders for color assignment
function getSenderIndex(messages: ChatMessage[], senderId: string): number {
  const uniqueSenders: string[] = [];
  for (const msg of messages) {
    const key = `${msg.from.nickname}#${msg.from.tag}`;
    if (!uniqueSenders.includes(key)) {
      uniqueSenders.push(key);
    }
    if (key === senderId) {
      return uniqueSenders.indexOf(key);
    }
  }
  return 0;
}

export function MessageArea({ messages }: MessageAreaProps) {
  const visibleMessages = messages.slice(-MAX_MESSAGES);

  if (visibleMessages.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        <Text dimColor>No messages yet. Say hello!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden">
      {visibleMessages.map((msg) => {
        const senderKey = `${msg.from.nickname}#${msg.from.tag}`;
        const colorIndex = getSenderIndex(visibleMessages, senderKey);
        const color = getUserColor(colorIndex);
        const badgeColor = theme.badge[msg.from.aiCli];

        return (
          <Box key={msg.id}>
            <Text color={badgeColor}>[{msg.from.aiCli}]</Text>
            <Text color={color}> {msg.from.nickname}#{msg.from.tag}</Text>
            <Text color={theme.text.secondary}>: </Text>
            <Text>{msg.content}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
