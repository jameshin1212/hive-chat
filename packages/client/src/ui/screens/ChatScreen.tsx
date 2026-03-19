import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Identity, ChatMessage } from '@cling-talk/shared';
import { DEFAULT_TERMINAL_WIDTH } from '@cling-talk/shared';
import { parseInput, isKnownCommand, COMMANDS } from '../../commands/CommandParser.js';
import { formatIdentityDisplay } from '../../identity/IdentityManager.js';
import { useGracefulExit } from '../../hooks/useGracefulExit.js';
import { StatusBar } from '../components/StatusBar.js';
import { MessageArea } from '../components/MessageArea.js';
import { IMETextInput } from '../components/IMETextInput.js';
import { theme } from '../theme.js';

interface ChatScreenProps {
  identity: Identity;
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `local-${messageCounter}`;
}

export function ChatScreen({ identity }: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const columns = stdout?.columns ?? DEFAULT_TERMINAL_WIDTH;
  const gracefulExit = useGracefulExit();

  // Wire Ctrl+C to graceful exit
  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      gracefulExit();
    }
  });

  const handleSubmit = useCallback((text: string) => {
    const parsed = parseInput(text);

    if (parsed.type === 'command') {
      if (parsed.name === '/quit') {
        gracefulExit();
        return;
      }
      if (parsed.name === '/help') {
        // Add system message listing commands
        const helpLines = Object.entries(COMMANDS)
          .map(([cmd, info]) => `  ${cmd} - ${info.description}`)
          .join('\n');
        const sysMsg: ChatMessage = {
          id: nextMessageId(),
          from: { nickname: 'system', tag: '0000', aiCli: 'Claude Code', schemaVersion: 1 },
          content: `Available commands:\n${helpLines}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, sysMsg]);
        return;
      }
      if (!isKnownCommand(parsed.name)) {
        const sysMsg: ChatMessage = {
          id: nextMessageId(),
          from: { nickname: 'system', tag: '0000', aiCli: 'Claude Code', schemaVersion: 1 },
          content: `Unknown command: ${parsed.name}. Type /help for available commands.`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, sysMsg]);
        return;
      }
      // Other known commands (placeholder for Phase 2+)
      return;
    }

    // Regular message — add to local messages (no networking in Phase 1)
    const msg: ChatMessage = {
      id: nextMessageId(),
      from: identity,
      content: parsed.content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
  }, [identity, gracefulExit]);

  const separator = '\u2500'.repeat(columns);

  return (
    <Box flexDirection="column" height={rows}>
      <StatusBar identity={identity} />
      <Box>
        <Text color={theme.ui.separator}>{separator}</Text>
      </Box>
      <MessageArea messages={messages} />
      <Box>
        <Text color={theme.ui.separator}>{separator}</Text>
      </Box>
      <IMETextInput onSubmit={handleSubmit} placeholder="Type a message or /help..." />
    </Box>
  );
}
