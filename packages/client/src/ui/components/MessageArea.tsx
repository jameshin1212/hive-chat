import React from 'react';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import type { ChatMessage, Identity } from '@cling-talk/shared';
import { MAX_MESSAGES } from '@cling-talk/shared';
import { theme, getUserColor } from '../theme.js';

interface MessageAreaProps {
  messages: ChatMessage[];
  myIdentity?: Identity;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
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

export function MessageArea({ messages, myIdentity }: MessageAreaProps) {
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

        const isOwnMessage = myIdentity
          && msg.from.nickname === myIdentity.nickname
          && msg.from.tag === myIdentity.tag;
        const nameColor = isOwnMessage ? theme.text.primary : color;

        return (
          <Box key={msg.id}>
            <Text color={theme.text.secondary}>[{formatTimestamp(msg.timestamp)}] </Text>
            <Text color={badgeColor}>[{msg.from.aiCli}]</Text>
            <Text color={nameColor}> {msg.from.nickname}#{msg.from.tag}</Text>
            <Text color={theme.text.secondary}>: </Text>
            <Text>{msg.content}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
