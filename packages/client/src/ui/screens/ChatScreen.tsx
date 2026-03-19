import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Identity, ChatMessage } from '@cling-talk/shared';
import { DEFAULT_TERMINAL_WIDTH, MAX_MESSAGES } from '@cling-talk/shared';
import { parseNickTag } from '@cling-talk/shared';
import { parseInput, isKnownCommand, COMMANDS, filterCommands } from '../../commands/CommandParser.js';
import { useGracefulExit } from '../../hooks/useGracefulExit.js';
import { useServerConnection } from '../../hooks/useServerConnection.js';
import type { ConnectionStatus } from '../../hooks/useServerConnection.js';
import { useNearbyUsers } from '../../hooks/useNearbyUsers.js';
import { useChatSession } from '../../hooks/useChatSession.js';
import { useFriends } from '../../hooks/useFriends.js';
import type { FriendStatus } from '../../hooks/useFriends.js';
import { addFriend, removeFriend, isFriend } from '../../friends/FriendManager.js';
import { StatusBar } from '../components/StatusBar.js';
import { MessageArea } from '../components/MessageArea.js';
import { IMETextInput } from '../components/IMETextInput.js';
import { UserList } from '../components/UserList.js';
import { FriendList } from '../components/FriendList.js';
import { ChatRequestOverlay } from '../components/ChatRequestOverlay.js';
import { CommandSuggestions } from '../components/CommandSuggestions.js';
import { theme } from '../theme.js';
import type { Key } from 'ink';

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
  const [showFriendList, setShowFriendList] = useState(false);
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const columns = stdout?.columns ?? DEFAULT_TERMINAL_WIDTH;
  const messageAreaHeight = rows - 4; // StatusBar(1) + separator(1) + separator(1) + IMETextInput(1)
  const gracefulExit = useGracefulExit();

  const { status, client, transportType } = useServerConnection(identity);
  const { users, radiusKm, cycleRadius, refreshUsers } = useNearbyUsers(client);
  const {
    chatStatus, partner, sessionId, chatMessages,
    incomingRequest, partnerLeft, requestChat, acceptRequest,
    declineRequest, sendMessage, leaveChat,
  } = useChatSession(client, status);
  const { friendStatuses, friendCount, onlineFriendCount, refreshFriendStatuses } = useFriends(client, status);

  // Command autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');

  const isInChat = chatStatus === 'active' || chatStatus === 'requesting' || chatStatus === 'disconnected';
  const isInputDisabled = chatStatus === 'disconnected' || chatStatus === 'requesting';

  const addSystemMessage = useCallback((content: string) => {
    const sysMsg: ChatMessage = {
      id: nextMessageId(),
      from: { nickname: 'system', tag: '0000', aiCli: 'Claude Code', schemaVersion: 1 },
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, sysMsg].slice(-MAX_MESSAGES));
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

  const handleTextChange = useCallback((text: string) => {
    setCurrentInput(text);
    if (text.startsWith('/') && text.indexOf(' ') === -1) {
      const filtered = filterCommands(text);
      setShowSuggestions(filtered.length > 0);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  const handleKeyIntercept = useCallback((_input: string, key: Key, setText: (t: string) => void): boolean => {
    if (!showSuggestions) return false;
    const filtered = filterCommands(currentInput);
    if (key.upArrow) {
      setSuggestionIndex(prev => Math.max(0, prev - 1));
      return true;
    }
    if (key.downArrow) {
      setSuggestionIndex(prev => Math.min(filtered.length - 1, prev + 1));
      return true;
    }
    if (key.return && filtered.length > 0) {
      const selected = filtered[suggestionIndex];
      if (selected) {
        setText(selected.name + ' ');
        setShowSuggestions(false);
      }
      return true;
    }
    if (key.escape) {
      setShowSuggestions(false);
      return true;
    }
    return false;
  }, [showSuggestions, currentInput, suggestionIndex]);

  const handleSubmit = useCallback((text: string) => {
    const parsed = parseInput(text);

    if (parsed.type === 'command') {
      if (parsed.name === '/exit') {
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
      if (parsed.name === '/friends') {
        setShowFriendList(true);
        refreshFriendStatuses();
        return;
      }
      if (parsed.name === '/addfriend') {
        if (parsed.args.length === 0) {
          addSystemMessage('Usage: /addfriend nick#TAG');
          return;
        }
        const nickTag = parsed.args[0]!;
        const parsedNt = parseNickTag(nickTag);
        if (!parsedNt) {
          addSystemMessage('Invalid format. Use: nick#TAG');
          return;
        }
        if (parsedNt.nickname === identity.nickname && parsedNt.tag === identity.tag) {
          addSystemMessage('Cannot add yourself');
          return;
        }
        if (isFriend(parsedNt.nickname, parsedNt.tag)) {
          addSystemMessage('Already in friend list');
          return;
        }
        addFriend(parsedNt.nickname, parsedNt.tag);
        addSystemMessage(`Added ${nickTag} to friends`);
        refreshFriendStatuses();
        return;
      }
      if (parsed.name === '/removefriend') {
        if (parsed.args.length === 0) {
          addSystemMessage('Usage: /removefriend nick#TAG');
          return;
        }
        const nickTag = parsed.args[0]!;
        const parsedNt = parseNickTag(nickTag);
        if (!parsedNt) {
          addSystemMessage('Invalid format. Use: nick#TAG');
          return;
        }
        const removed = removeFriend(parsedNt.nickname, parsedNt.tag);
        if (removed) {
          addSystemMessage(`Removed ${nickTag} from friends`);
          refreshFriendStatuses();
        } else {
          addSystemMessage(`${nickTag} is not in your friend list`);
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
      setMessages(prev => [...prev, msg].slice(-MAX_MESSAGES));
    }
  }, [identity, gracefulExit, addSystemMessage, refreshUsers, cycleRadius, isInChat, chatStatus, partner, sendMessage, leaveChat, refreshFriendStatuses]);

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
      <MessageArea
        messages={displayMessages}
        myIdentity={identity}
        availableHeight={messageAreaHeight}
        isActive={!showUserList && !showFriendList && !incomingRequest}
      />
      {showFriendList && !showUserList && !incomingRequest && (
        <FriendList
          friends={friendStatuses}
          visible={showFriendList}
          onSelect={(friend: FriendStatus) => {
            if (friend.status === 'online') {
              requestChat({ nickname: friend.nickname, tag: friend.tag, aiCli: (friend.aiCli ?? 'Claude Code') as Identity['aiCli'], distance: 0, status: 'online' });
              setShowFriendList(false);
            } else {
              addSystemMessage(`${friend.nickname}#${friend.tag} is currently offline`);
            }
          }}
          onClose={() => setShowFriendList(false)}
        />
      )}
      {showUserList && (
        <UserList
          users={users}
          visible={showUserList}
          onSelect={(user) => {
            requestChat(user);
            setShowUserList(false);
          }}
          onClose={() => setShowUserList(false)}
        />
      )}
      {incomingRequest && (
        <ChatRequestOverlay
          request={incomingRequest}
          onAccept={acceptRequest}
          onDecline={declineRequest}
        />
      )}
      {showSuggestions && (
        <CommandSuggestions
          suggestions={filterCommands(currentInput)}
          selectedIndex={suggestionIndex}
          visible={showSuggestions}
        />
      )}
      <Box>
        <Text color={theme.ui.separator}>{separator}</Text>
      </Box>
      <StatusBar
        identity={identity}
        connectionStatus={status}
        radiusKm={radiusKm}
        nearbyCount={users.length}
        chatPartner={chatPartner}
        onlineFriendCount={onlineFriendCount}
        friendCount={friendCount}
        transportType={transportType}
      />
      <Box>
        <Text color={theme.ui.separator}>{separator}</Text>
      </Box>
      <IMETextInput
        onSubmit={handleSubmit}
        onTextChange={handleTextChange}
        onKeyIntercept={handleKeyIntercept}
        placeholder={inputPlaceholder}
        isActive={!isInputDisabled && !showUserList && !showFriendList && !incomingRequest}
      />
    </Box>
  );
}
