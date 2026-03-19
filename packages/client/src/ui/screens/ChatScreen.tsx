import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Identity, ChatMessage } from '@cling-talk/shared';
import { DEFAULT_TERMINAL_WIDTH } from '@cling-talk/shared';
import { parseInput, isKnownCommand, COMMANDS } from '../../commands/CommandParser.js';
import { useGracefulExit } from '../../hooks/useGracefulExit.js';
import { useServerConnection } from '../../hooks/useServerConnection.js';
import type { ConnectionStatus } from '../../hooks/useServerConnection.js';
import { useNearbyUsers } from '../../hooks/useNearbyUsers.js';
import { useChatSession } from '../../hooks/useChatSession.js';
import { StatusBar } from '../components/StatusBar.js';
import { MessageArea } from '../components/MessageArea.js';
import { IMETextInput } from '../components/IMETextInput.js';
import { UserList } from '../components/UserList.js';
import { ChatRequestOverlay } from '../components/ChatRequestOverlay.js';
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
  const [showUserList, setShowUserList] = useState(false);
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const columns = stdout?.columns ?? DEFAULT_TERMINAL_WIDTH;
  const gracefulExit = useGracefulExit();

  const { status, client } = useServerConnection(identity);
  const { users, radiusKm, cycleRadius, refreshUsers } = useNearbyUsers(client);
  const {
    chatStatus, partner, sessionId, chatMessages,
    incomingRequest, partnerLeft, requestChat, acceptRequest,
    declineRequest, sendMessage, leaveChat,
  } = useChatSession(client, status);

  const isInChat = chatStatus === 'active' || chatStatus === 'requesting' || chatStatus === 'disconnected';
  const isInputDisabled = chatStatus === 'disconnected' || chatStatus === 'requesting';

  const addSystemMessage = useCallback((content: string) => {
    const sysMsg: ChatMessage = {
      id: nextMessageId(),
      from: { nickname: 'system', tag: '0000', aiCli: 'Claude Code', schemaVersion: 1 },
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, sysMsg]);
  }, []);

  // Connection status system messages
  const prevStatusRef = useRef<ConnectionStatus>(status);
  useEffect(() => {
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;

    switch (status) {
      case 'connected':
        addSystemMessage('Connected to signaling server');
        break;
      case 'reconnecting':
        addSystemMessage('Connection lost. Reconnecting...');
        break;
      case 'offline':
        addSystemMessage('Disconnected from server');
        break;
    }
  }, [status, addSystemMessage]);

  // Wire Ctrl+C to graceful exit, Tab to cycle radius
  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      gracefulExit();
    }
    if (key.tab && !isInChat) {
      cycleRadius();
    }
  });

  // Radius change system message
  const prevRadiusRef = useRef<number>(radiusKm);
  useEffect(() => {
    if (prevRadiusRef.current === radiusKm) return;
    prevRadiusRef.current = radiusKm;
    addSystemMessage(`Discovery radius changed to ${radiusKm}km`);
  }, [radiusKm, addSystemMessage]);

  const handleSubmit = useCallback((text: string) => {
    const parsed = parseInput(text);

    if (parsed.type === 'command') {
      if (parsed.name === '/quit') {
        gracefulExit();
        return;
      }
      if (parsed.name === '/help') {
        const helpLines = Object.entries(COMMANDS)
          .map(([cmd, info]) => `  ${cmd} - ${info.description}`)
          .join('\n');
        addSystemMessage(`Available commands:\n${helpLines}`);
        return;
      }
      if (parsed.name === '/users') {
        setShowUserList(true);
        refreshUsers();
        return;
      }
      if (parsed.name === '/radius') {
        cycleRadius();
        return;
      }
      if (parsed.name === '/leave') {
        if (isInChat) {
          const partnerName = partner ? `${partner.nickname}#${partner.tag}` : 'chat';
          leaveChat();
          addSystemMessage(`Left chat with ${partnerName}`);
        } else {
          addSystemMessage('Not in a chat');
        }
        return;
      }
      if (!isKnownCommand(parsed.name)) {
        addSystemMessage(`Unknown command: ${parsed.name}. Type /help for available commands.`);
        return;
      }
      // Other known commands (placeholder for future phases)
      return;
    }

    // Regular message
    if (isInChat && chatStatus === 'active') {
      sendMessage(parsed.content, identity);
    } else {
      const msg: ChatMessage = {
        id: nextMessageId(),
        from: identity,
        content: parsed.content,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
    }
  }, [identity, gracefulExit, addSystemMessage, refreshUsers, cycleRadius, isInChat, chatStatus, partner, sendMessage, leaveChat]);

  // Determine which messages to display
  const displayMessages = isInChat ? chatMessages : messages;

  // Chat partner for status bar
  const chatPartner = (isInChat || chatStatus === 'requesting') && partner
    ? { nickname: partner.nickname, tag: partner.tag }
    : null;

  // Input placeholder
  const inputPlaceholder = isInputDisabled
    ? 'Connection lost...'
    : isInChat
      ? 'Type a message...'
      : 'Type a message or /help...';

  const separator = '\u2500'.repeat(columns);

  return (
    <Box flexDirection="column" height={rows}>
      <StatusBar
        identity={identity}
        connectionStatus={status}
        radiusKm={radiusKm}
        nearbyCount={users.length}
        chatPartner={chatPartner}
      />
      <Box>
        <Text color={theme.ui.separator}>{separator}</Text>
      </Box>
      {showUserList ? (
        <UserList
          users={users}
          visible={showUserList}
          onSelect={(user) => {
            requestChat(user);
            setShowUserList(false);
          }}
          onClose={() => setShowUserList(false)}
        />
      ) : (
        <MessageArea messages={displayMessages} myIdentity={identity} />
      )}
      {incomingRequest && (
        <ChatRequestOverlay
          request={incomingRequest}
          onAccept={acceptRequest}
          onDecline={declineRequest}
        />
      )}
      <Box>
        <Text color={theme.ui.separator}>{separator}</Text>
      </Box>
      <IMETextInput
        onSubmit={handleSubmit}
        placeholder={inputPlaceholder}
        isActive={!isInputDisabled && !showUserList && !incomingRequest}
      />
    </Box>
  );
}
