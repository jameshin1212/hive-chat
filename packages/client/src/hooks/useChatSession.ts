import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionManager } from '../network/ConnectionManager.js';
import type { NearbyUser } from '@hivechat/shared';
import type { ChatSessionStatus, ChatMessage, Identity } from '@hivechat/shared';
import { CHAT_REQUEST_TIMEOUT_MS, MAX_MESSAGES } from '@hivechat/shared';

export interface IncomingRequest {
  sessionId: string;
  from: NearbyUser;
}

export interface ChatSessionReturn {
  chatStatus: ChatSessionStatus;
  partner: NearbyUser | null;
  sessionId: string | null;
  chatMessages: ChatMessage[];
  incomingRequest: IncomingRequest | null;
  partnerLeft: boolean;
  requestChat: (target: NearbyUser) => void;
  acceptRequest: () => void;
  declineRequest: () => void;
  sendMessage: (content: string, myIdentity: Identity) => void;
  leaveChat: () => void;
}

/**
 * Ring terminal bell for incoming message notification.
 */
export function ringBell(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x07');
  }
}

function createSystemMessage(content: string, kind?: 'transition'): ChatMessage {
  return {
    id: crypto.randomUUID(),
    from: { nickname: 'system', tag: '0000', aiCli: 'Claude Code', schemaVersion: 1 },
    content,
    timestamp: Date.now(),
    kind,
  };
}

export function useChatSession(
  client: ConnectionManager | null,
  connectionStatus: string,
): ChatSessionReturn {
  const [chatStatus, setChatStatus] = useState<ChatSessionStatus>('idle');
  const [partner, setPartner] = useState<NearbyUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const [partnerLeft, setPartnerLeft] = useState(false);

  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnectionStatusRef = useRef<string>(connectionStatus);
  const partnerRef = useRef<NearbyUser | null>(null);

  // Keep partnerRef in sync
  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  // Connection status changes
  useEffect(() => {
    const prev = prevConnectionStatusRef.current;
    prevConnectionStatusRef.current = connectionStatus;

    if (connectionStatus === 'reconnecting' && chatStatus === 'active') {
      setChatStatus('disconnected');
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage('Connection lost. Attempting to reconnect...'),
      ].slice(-MAX_MESSAGES));
    }

    if (prev === 'reconnecting' && connectionStatus === 'connected' && partnerRef.current) {
      // Re-request chat on reconnect
      if (client) {
        client.requestChat(partnerRef.current.nickname, partnerRef.current.tag);
        setChatStatus('requesting');
        setChatMessages(msgs => [
          ...msgs,
          createSystemMessage('Reconnected. Re-requesting chat...'),
        ].slice(-MAX_MESSAGES));
      }
    }
  }, [connectionStatus, chatStatus, client]);

  // Subscribe to SignalingClient chat events
  useEffect(() => {
    if (!client) return;

    const handleChatRequested = (data: { sessionId: string; from: NearbyUser }) => {
      // If already in a chat, auto-decline
      if (chatStatus === 'active') {
        client.declineChat(data.sessionId);
        return;
      }
      setIncomingRequest({ sessionId: data.sessionId, from: data.from });
    };

    const handleChatAccepted = (data: { sessionId: string; partner: NearbyUser }) => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      setChatStatus('active');
      setPartner(data.partner);
      setSessionId(data.sessionId);
      setPartnerLeft(false);
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage(`Chat started with ${data.partner.nickname}#${data.partner.tag}`, 'transition'),
      ].slice(-MAX_MESSAGES));
    };

    const handleChatDeclined = (_data: { sessionId: string }) => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      setChatStatus('idle');
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage('No response from user'),
      ].slice(-MAX_MESSAGES));
    };

    const handleChatMsg = (data: { sessionId: string; from: { nickname: string; tag: string }; content: string; timestamp: number }) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        from: { nickname: data.from.nickname, tag: data.from.tag, aiCli: 'Claude Code', schemaVersion: 1 },
        content: data.content,
        timestamp: data.timestamp,
      };
      setChatMessages(msgs => [...msgs, msg].slice(-MAX_MESSAGES));
      ringBell();
    };

    const handleChatLeft = (data: { sessionId: string; nickname: string; tag: string }) => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage(`${data.nickname}#${data.tag} left the chat`, 'transition'),
      ].slice(-MAX_MESSAGES));
      setPartnerLeft(true);
    };

    const handleChatUserOffline = (data: { nickname: string; tag: string }) => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage(`${data.nickname}#${data.tag} went offline`, 'transition'),
      ].slice(-MAX_MESSAGES));
      setPartnerLeft(true);
    };

    const handleChatError = (data: { code?: string; message?: string; error?: string }) => {
      const code = data.code;
      const message = data.message || data.error || 'Unknown error';
      if (code === 'USER_OFFLINE' || code === 'USER_BUSY') {
        setChatMessages(msgs => [
          ...msgs,
          createSystemMessage(message),
        ].slice(-MAX_MESSAGES));
        setChatStatus('idle');
        setPartner(null);
        setSessionId(null);
      } else {
        // P2P send error etc.
        setChatMessages(msgs => [
          ...msgs,
          createSystemMessage(message),
        ].slice(-MAX_MESSAGES));
      }
    };

    // P2P events
    const handleP2PConnecting = () => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage('Establishing P2P connection...'),
      ].slice(-MAX_MESSAGES));
    };

    const handleP2PStatusMsg = (msg: string) => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage(msg),
      ].slice(-MAX_MESSAGES));
    };

    const handleP2PConnected = () => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage('P2P connected — messages are direct and encrypted', 'transition'),
      ].slice(-MAX_MESSAGES));
    };

    const handleP2PFailed = (data: { reason: string }) => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage(`P2P connection failed: ${data.reason}`),
        createSystemMessage('Use /leave to return to main screen'),
      ].slice(-MAX_MESSAGES));
      setPartnerLeft(true);
    };

    const handleP2PDisconnected = () => {
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage('P2P connection lost', 'transition'),
      ].slice(-MAX_MESSAGES));
      setPartnerLeft(true);
    };

    client.on('chat_requested', handleChatRequested);
    client.on('chat_accepted', handleChatAccepted);
    client.on('chat_declined', handleChatDeclined);
    client.on('chat_msg', handleChatMsg);
    client.on('chat_left', handleChatLeft);
    client.on('chat_user_offline', handleChatUserOffline);
    client.on('chat_error', handleChatError);
    client.on('p2p_connecting', handleP2PConnecting);
    client.on('p2p_connected', handleP2PConnected);
    client.on('p2p_failed', handleP2PFailed);
    client.on('p2p_disconnected', handleP2PDisconnected);
    client.on('p2p_status_msg', handleP2PStatusMsg);

    return () => {
      client.off('chat_requested', handleChatRequested);
      client.off('chat_accepted', handleChatAccepted);
      client.off('chat_declined', handleChatDeclined);
      client.off('chat_msg', handleChatMsg);
      client.off('chat_left', handleChatLeft);
      client.off('chat_user_offline', handleChatUserOffline);
      client.off('chat_error', handleChatError);
      client.off('p2p_connecting', handleP2PConnecting);
      client.off('p2p_connected', handleP2PConnected);
      client.off('p2p_failed', handleP2PFailed);
      client.off('p2p_disconnected', handleP2PDisconnected);
      client.off('p2p_status_msg', handleP2PStatusMsg);
    };
  }, [client, chatStatus]);

  const requestChat = useCallback((target: NearbyUser) => {
    if (!client) return;
    client.requestChat(target.nickname, target.tag);
    setChatStatus('requesting');
    setPartner(target);
    setPartnerLeft(false);
    setChatMessages([]);

    // Start timeout
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }
    requestTimeoutRef.current = setTimeout(() => {
      setChatStatus('idle');
      setPartner(null);
      setChatMessages(msgs => [
        ...msgs,
        createSystemMessage('No response'),
      ].slice(-MAX_MESSAGES));
      requestTimeoutRef.current = null;
    }, CHAT_REQUEST_TIMEOUT_MS);
  }, [client]);

  const acceptRequest = useCallback(() => {
    if (!client || !incomingRequest) return;
    client.acceptChat(incomingRequest.sessionId);
    setChatStatus('active');
    setPartner(incomingRequest.from as unknown as NearbyUser);
    setSessionId(incomingRequest.sessionId);
    setPartnerLeft(false);
    setIncomingRequest(null);
    setChatMessages([
      createSystemMessage(`Chat started with ${incomingRequest.from.nickname}#${incomingRequest.from.tag}`, 'transition'),
    ]);
  }, [client, incomingRequest]);

  const declineRequest = useCallback(() => {
    if (!client || !incomingRequest) return;
    client.declineChat(incomingRequest.sessionId);
    setIncomingRequest(null);
  }, [client, incomingRequest]);

  const sendMessage = useCallback((content: string, myIdentity: Identity) => {
    if (!client || !sessionId) return;
    client.sendChatMessage(sessionId, content);
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      from: myIdentity,
      content,
      timestamp: Date.now(),
    };
    setChatMessages(msgs => [...msgs, msg].slice(-MAX_MESSAGES));
    // Do NOT ring bell for own messages
  }, [client, sessionId]);

  const leaveChat = useCallback(() => {
    if (!client || !sessionId) return;
    client.leaveChat(sessionId);
    setChatStatus('idle');
    setPartner(null);
    setSessionId(null);
    setChatMessages([]);
    setPartnerLeft(false);
  }, [client, sessionId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, []);

  return {
    chatStatus,
    partner,
    sessionId,
    chatMessages,
    incomingRequest,
    partnerLeft,
    requestChat,
    acceptRequest,
    declineRequest,
    sendMessage,
    leaveChat,
  };
}
