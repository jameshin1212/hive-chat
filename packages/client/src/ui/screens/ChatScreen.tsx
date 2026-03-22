import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Identity, ChatMessage } from '@hivechat/shared';
import { MAX_MESSAGES } from '@hivechat/shared';
import { parseNickTag } from '@hivechat/shared';
import { parseInput, isKnownCommand, COMMANDS, filterCommands, isChatAllowedCommand } from '../../commands/CommandParser.js';
import { useGracefulExit } from '../../hooks/useGracefulExit.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
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
import { SettingsOverlay } from '../components/SettingsOverlay.js';
import { WelcomeBox, getWelcomeBoxHeight } from '../components/WelcomeBox.js';
import { HelpOverlay } from '../components/HelpOverlay.js';
import { ConfirmOverlay } from '../components/ConfirmOverlay.js';
import { AddFriendOverlay } from '../components/AddFriendOverlay.js';
import { theme } from '../theme.js';
import type { Key } from 'ink';

/** Long separator — Ink truncates to actual width via wrap="truncate" */
const SEPARATOR_LONG = '\u2500'.repeat(300);

interface ChatScreenProps {
  identity: Identity;
  onIdentityChange?: (identity: Identity) => void;
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `local-${messageCounter}`;
}

export function ChatScreen({ identity, onIdentityChange }: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [removeFriendMode, setRemoveFriendMode] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const { rows, columns, breakpoint } = useTerminalSize();
  const gracefulExit = useGracefulExit();

  const { status, client, transportType } = useServerConnection(identity);
  const { users, refreshUsers } = useNearbyUsers(client);
  const {
    chatStatus, partner, sessionId, chatMessages,
    incomingRequest, partnerLeft, requestChat, cancelRequest,
    acceptRequest, declineRequest, sendMessage, leaveChat,
  } = useChatSession(client, status);
  const { friendStatuses, friendCount, onlineFriendCount, refreshFriendStatuses } = useFriends(client, status);

  // Command autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');

  const isInChat = chatStatus === 'active' || chatStatus === 'requesting' || chatStatus === 'disconnected';
  const isInputDisabled = chatStatus === 'disconnected' || chatStatus === 'requesting';

  // Dynamic overlay height — subtract from MessageArea so overlays don't clip below StatusBar
  // +2 for border (top+bottom), +1 for title row
  const maxListVisible = 8;
  const overlayHeight = (() => {
    if (showSettings) return 8;
    if (confirmState) return 4; // border(2) + message + buttons
    if (showHelp) return Object.keys(COMMANDS).length + 4 + 2; // items + extra lines + border
    if (showAddFriend) return 4; // border(2) + title + instruction
    if (showUserList) {
      if (users.length === 0) return 4;
      const items = Math.min(users.length, maxListVisible);
      const indicators = users.length > maxListVisible ? 2 : 0;
      return items + indicators + 1 + 2;
    }
    if (showFriendList || removeFriendMode) {
      if (friendStatuses.length === 0) return 4;
      const items = Math.min(friendStatuses.length, maxListVisible);
      const indicators = friendStatuses.length > maxListVisible ? 2 : 0;
      return items + indicators + 1 + 2;
    }
    if (showSuggestions) {
      const filtered = filterCommands(currentInput, isInChat);
      return Math.min(filtered.length, 8) + (filtered.length > 8 ? 2 : 0) + 2;
    }
    return 0;
  })();
  // Cap overlay height so input area is always visible (at least messageArea 1 row)
  const maxOverlayHeight = Math.max(0, rows - 5);
  const effectiveOverlayHeight = Math.min(overlayHeight, maxOverlayHeight);
  const messageAreaHeight = Math.max(1, rows - 4 - effectiveOverlayHeight);

  const addSystemMessage = useCallback((content: string, kind?: 'transition') => {
    const sysMsg: ChatMessage = {
      id: nextMessageId(),
      from: { nickname: 'system', tag: '0000', aiCli: 'Claude Code', schemaVersion: 1 },
      content,
      timestamp: Date.now(),
      kind,
    };
    setMessages(prev => [...prev, sysMsg].slice(-MAX_MESSAGES));
  }, []);

  const handleIdentityChange = useCallback((newIdentity: Identity) => {
    onIdentityChange?.(newIdentity);
    if (newIdentity.nickname !== identity.nickname) {
      addSystemMessage(`Nickname changed to ${newIdentity.nickname}#${newIdentity.tag}`);
    }
    if (newIdentity.aiCli !== identity.aiCli) {
      addSystemMessage(`AI CLI changed to ${newIdentity.aiCli}`);
    }
  }, [identity, onIdentityChange, addSystemMessage]);

  // Connection status system messages
  const prevStatusRef = useRef<ConnectionStatus>(status);
  useEffect(() => {
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;

    switch (status) {
      case 'connected':
        addSystemMessage('You are in the lobby. Type /nearby or press Tab to find people.', 'transition');
        break;
      case 'reconnecting':
        addSystemMessage('Connection lost. Reconnecting...');
        break;
      case 'offline':
        addSystemMessage('Disconnected from server');
        break;
    }
  }, [status, addSystemMessage]);

  // Wire Ctrl+C to graceful exit, Tab to show users
  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      gracefulExit();
    }
    if (key.tab && !isInChat && !showFriendList) {
      if (showUserList) {
        setShowUserList(false);
      } else {
        setShowUserList(true);
        refreshUsers();
      }
    }
    if (key.escape && chatStatus === 'requesting') {
      cancelRequest();
      addSystemMessage('Chat request cancelled');
    }
  });


  const handleTextChange = useCallback((text: string) => {
    setCurrentInput(text);
    if (text.startsWith('/') && text.indexOf(' ') === -1) {
      const filtered = filterCommands(text, isInChat);
      setShowSuggestions(filtered.length > 0);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  const handleSubmit = useCallback((text: string) => {
    const parsed = parseInput(text);

    if (parsed.type === 'command') {
      // Block non-chat commands during active chat
      if (isInChat && !isChatAllowedCommand(parsed.name)) {
        addSystemMessage('Only /leave, /help, /exit available during chat');
        return;
      }
      if (parsed.name === '/exit') {
        gracefulExit();
        return;
      }
      if (parsed.name === '/help') {
        setShowHelp(true);
        return;
      }
      if (parsed.name === '/nearby') {
        setShowUserList(true);
        refreshUsers();
        return;
      }
      if (parsed.name === '/leave') {
        if (isInChat) {
          const partnerName = partner ? `${partner.nickname}#${partner.tag}` : 'chat';
          setConfirmState({
            message: `Leave chat with ${partnerName}?`,
            onConfirm: () => {
              leaveChat();
              addSystemMessage(`Left chat with ${partnerName}`, 'transition');
              setConfirmState(null);
            },
          });
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
          // No args: show overlay prompt
          setShowAddFriend(true);
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
        setShowAddFriend(false);
        refreshFriendStatuses();
        return;
      }
      if (parsed.name === '/removefriend') {
        // Show friend list for selection → then confirm
        setRemoveFriendMode(true);
        refreshFriendStatuses();
        return;
      }
      if (parsed.name === '/settings') {
        setShowSettings(true);
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
  }, [identity, gracefulExit, addSystemMessage, refreshUsers, isInChat, chatStatus, partner, sendMessage, leaveChat, refreshFriendStatuses]);

  const handleKeyIntercept = useCallback((_input: string, key: Key, setText: (t: string) => void): boolean => {
    if (!showSuggestions) return false;
    const filtered = filterCommands(currentInput, isInChat);
    if (key.upArrow) {
      setSuggestionIndex(prev => prev <= 0 ? filtered.length - 1 : prev - 1);
      return true;
    }
    if (key.downArrow) {
      setSuggestionIndex(prev => prev >= filtered.length - 1 ? 0 : prev + 1);
      return true;
    }
    if (key.return && filtered.length > 0) {
      const selected = filtered[suggestionIndex];
      if (selected) {
        setText('');
        setShowSuggestions(false);
        handleSubmit(selected.name);
      }
      return true;
    }
    if (key.escape) {
      setShowSuggestions(false);
      return true;
    }
    return false;
  }, [showSuggestions, currentInput, suggestionIndex, handleSubmit]);

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

  const hasOverlay = showUserList || showFriendList || showSettings || showHelp || showAddFriend || removeFriendMode || !!confirmState || !!incomingRequest;
  const showWelcome = status === 'connected' && !isInChat && messages.length <= 2 && !hasOverlay;
  const welcomeBoxHeight = showWelcome ? getWelcomeBoxHeight(breakpoint) : 0;

  return (
    <Box flexDirection="column" height={rows}>
      {showWelcome && (
        <WelcomeBox identity={identity} breakpoint={breakpoint} />
      )}
      <MessageArea
        messages={displayMessages}
        myIdentity={identity}
        availableHeight={showWelcome ? Math.max(1, messageAreaHeight - welcomeBoxHeight) : messageAreaHeight}
        columns={columns}
        isActive={!showUserList && !showFriendList && !incomingRequest && !showSettings}
      />
      {showFriendList && !showUserList && !incomingRequest && !removeFriendMode && (
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
      {removeFriendMode && !confirmState && (
        <FriendList
          friends={friendStatuses}
          visible={removeFriendMode}
          onSelect={(friend: FriendStatus) => {
            const nickTag = `${friend.nickname}#${friend.tag}`;
            setConfirmState({
              message: `Remove ${nickTag} from friends?`,
              onConfirm: () => {
                removeFriend(friend.nickname, friend.tag);
                addSystemMessage(`Removed ${nickTag} from friends`);
                refreshFriendStatuses();
                setConfirmState(null);
                setRemoveFriendMode(false);
              },
            });
          }}
          onClose={() => setRemoveFriendMode(false)}
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
      {showSettings && (
        <SettingsOverlay
          identity={identity}
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          onIdentityChange={(newIdentity) => {
            handleIdentityChange(newIdentity);
            setShowSettings(false);
          }}
        />
      )}
      {showHelp && (
        <HelpOverlay visible={showHelp} onClose={() => setShowHelp(false)} />
      )}
      {showAddFriend && (
        <AddFriendOverlay
          visible={showAddFriend}
          onSubmit={(nickTag) => {
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
            setShowAddFriend(false);
            refreshFriendStatuses();
          }}
          onClose={() => setShowAddFriend(false)}
        />
      )}
      {confirmState && (
        <ConfirmOverlay
          message={confirmState.message}
          visible={!!confirmState}
          onConfirm={confirmState.onConfirm}
          onCancel={() => { setConfirmState(null); setRemoveFriendMode(false); }}
        />
      )}
      {showSuggestions && (
        <CommandSuggestions
          suggestions={filterCommands(currentInput, isInChat)}
          selectedIndex={suggestionIndex}
          visible={showSuggestions}
        />
      )}
      <Text color={theme.ui.separator} wrap="truncate">{SEPARATOR_LONG}</Text>
      <StatusBar
        identity={identity}
        connectionStatus={status}
        nearbyCount={users.length}
        chatPartner={chatPartner}
        isRequesting={chatStatus === 'requesting'}
        onlineFriendCount={onlineFriendCount}
        friendCount={friendCount}
        transportType={transportType}
        breakpoint={breakpoint}
      />
      <Text color={theme.ui.separator} wrap="truncate">{SEPARATOR_LONG}</Text>
      <IMETextInput
        onSubmit={handleSubmit}
        onTextChange={handleTextChange}
        onKeyIntercept={handleKeyIntercept}
        placeholder={showAddFriend ? 'Enter nick#TAG...' : inputPlaceholder}
        isActive={!isInputDisabled && !showUserList && !showFriendList && !incomingRequest && !showSettings && !showHelp && !showAddFriend && !removeFriendMode && !confirmState}
      />
    </Box>
  );
}
