import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import stringWidth from 'string-width';
import type { ChatMessage, Identity } from '@hivechat/shared';
import { DEFAULT_TERMINAL_WIDTH } from '@hivechat/shared';
import { theme, getUserColor } from '../theme.js';
import { TransitionLine } from './TransitionLine.js';

interface MessageAreaProps {
  messages: ChatMessage[];
  myIdentity?: Identity;
  availableHeight: number;
  columns?: number;
  isActive?: boolean;
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

/**
 * Calculate which messages are visible based on scroll offset.
 * scrollOffset=0 means show the latest (bottom) messages.
 * scrollOffset>0 means scrolled up by that many messages.
 */
export function calcVisibleMessages(
  messages: ChatMessage[],
  availableHeight: number,
  scrollOffset: number,
): ChatMessage[] {
  if (messages.length === 0 || availableHeight <= 0) return [];
  const maxOffset = Math.max(0, messages.length - availableHeight);
  const clampedOffset = Math.min(Math.max(0, scrollOffset), maxOffset);
  const startIndex = messages.length - availableHeight - clampedOffset;
  const safeStart = Math.max(0, startIndex);
  const endIndex = safeStart + Math.min(availableHeight, messages.length);
  return messages.slice(safeStart, endIndex);
}

export function MessageArea({ messages, myIdentity, availableHeight, columns = DEFAULT_TERMINAL_WIDTH, isActive }: MessageAreaProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const prevMessageCount = useRef(messages.length);

  // New message arrival: keep auto-scroll if at bottom (scrollOffset === 0)
  useEffect(() => {
    if (messages.length > prevMessageCount.current && scrollOffset === 0) {
      // Already at bottom, no action needed
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, scrollOffset]);

  // Reset scroll offset when switching chat contexts (message list identity changes)
  useEffect(() => {
    setScrollOffset(0);
  }, [messages === undefined]);

  // Page Up/Down handling
  useInput((_input, key) => {
    const pageSize = Math.max(1, availableHeight - 1);
    if (key.pageUp) {
      setScrollOffset(prev => Math.min(prev + pageSize, Math.max(0, messages.length - availableHeight)));
    }
    if (key.pageDown) {
      setScrollOffset(prev => Math.max(0, prev - pageSize));
    }
  }, { isActive: isActive !== false });

  // Reserve 1 line for "new messages" indicator when scrolled up
  const displayHeight = scrollOffset > 0 ? availableHeight - 1 : availableHeight;
  const visibleMessages = calcVisibleMessages(messages, displayHeight, scrollOffset);

  if (visibleMessages.length === 0) {
    return (
      <Box flexDirection="column" height={availableHeight} overflow="hidden">
        <Text dimColor>No messages yet. Say hello!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={availableHeight} overflow="hidden">
      {visibleMessages.map((msg) => {
        if (msg.from.nickname === 'system') {
          if (msg.kind === 'transition') {
            return <TransitionLine key={msg.id} text={msg.content} columns={columns} />;
          }
          if (msg.kind === 'error-transition') {
            return <TransitionLine key={msg.id} text={msg.content} columns={columns} color="red" />;
          }
          if (msg.kind === 'progress') {
            return (
              <Box key={msg.id}>
                <Text color="yellow">{' \u25CC '}{msg.content}</Text>
              </Box>
            );
          }
          if (msg.kind === 'progress-done') {
            return (
              <Box key={msg.id}>
                <Text color="green">{' \u25CF '}{msg.content}</Text>
              </Box>
            );
          }
          return (
            <Box key={msg.id}>
              <Text color={theme.text.secondary} italic>{'\u2500'} {msg.content} {'\u2500'}</Text>
            </Box>
          );
        }

        const badgeColor = theme.badge[msg.from.aiCli];

        const isOwnMessage = myIdentity
          && msg.from.nickname === myIdentity.nickname
          && msg.from.tag === myIdentity.tag;
        // Own = green, partner = yellow (1:1 chat, consistent colors)
        const nameColor = isOwnMessage ? theme.text.primary : 'yellow';

        return (
          <Box key={msg.id}>
            <Text color={theme.text.secondary}>[{formatTimestamp(msg.timestamp)}] </Text>
            <Text color={badgeColor}>[{msg.from.aiCli}]</Text>
            <Text color={nameColor}> {msg.from.nickname}#{msg.from.tag}</Text>
            <Text color={theme.text.secondary}>: </Text>
            <Text color={isOwnMessage ? theme.text.primary : undefined}>{msg.content}</Text>
          </Box>
        );
      })}
      {scrollOffset > 0 && (
        <Box justifyContent="center">
          <Text dimColor>{'\u2193'} new messages</Text>
        </Box>
      )}
    </Box>
  );
}
