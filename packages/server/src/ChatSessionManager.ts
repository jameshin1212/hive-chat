import { randomUUID } from 'node:crypto';

export interface ChatSession {
  id: string;
  userA: string; // userId (nickname#tag) - the requester
  userB: string; // userId (nickname#tag) - the target
  createdAt: number;
}

interface PendingRequest {
  from: string;
  to: string;
  sessionId: string;
  createdAt: number;
}

export class ChatSessionManager {
  /** Active sessions: sessionId -> ChatSession */
  private sessions = new Map<string, ChatSession>();

  /** Reverse index: userId -> sessionId (for active sessions) */
  private userSessions = new Map<string, string>();

  /** Pending requests: sessionId -> PendingRequest */
  private pendingRequests = new Map<string, PendingRequest>();

  /**
   * Create a pending chat request from one user to another.
   * Returns sessionId, or null if either user is already busy.
   */
  createPendingRequest(fromUserId: string, toUserId: string): string | null {
    if (this.isUserBusy(fromUserId) || this.isUserBusy(toUserId)) {
      return null;
    }

    const sessionId = randomUUID();
    this.pendingRequests.set(sessionId, {
      from: fromUserId,
      to: toUserId,
      sessionId,
      createdAt: Date.now(),
    });
    return sessionId;
  }

  /**
   * Accept a pending request, promoting it to an active session.
   * Returns the ChatSession, or null if the request doesn't exist.
   */
  acceptRequest(sessionId: string): ChatSession | null {
    const pending = this.pendingRequests.get(sessionId);
    if (!pending) return null;

    this.pendingRequests.delete(sessionId);

    const session: ChatSession = {
      id: sessionId,
      userA: pending.from,
      userB: pending.to,
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.userSessions.set(pending.from, sessionId);
    this.userSessions.set(pending.to, sessionId);

    return session;
  }

  /**
   * Decline a pending request, cleaning up state.
   */
  declineRequest(sessionId: string): void {
    this.pendingRequests.delete(sessionId);
  }

  /**
   * Get the active session for a user, or undefined.
   */
  getSessionByUser(userId: string): ChatSession | undefined {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId);
  }

  /**
   * Remove an active session, freeing both users.
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.userSessions.delete(session.userA);
    this.userSessions.delete(session.userB);
    this.sessions.delete(sessionId);
  }

  /**
   * Remove all pending requests involving a user (cleanup on disconnect).
   * Returns the sessionIds of removed pending requests.
   */
  removePendingByUser(userId: string): string[] {
    const removed: string[] = [];
    for (const [sessionId, pending] of this.pendingRequests) {
      if (pending.from === userId || pending.to === userId) {
        this.pendingRequests.delete(sessionId);
        removed.push(sessionId);
      }
    }
    return removed;
  }

  /**
   * Check if a user is busy (in active session or pending request).
   */
  isUserBusy(userId: string): boolean {
    // Check active sessions
    if (this.userSessions.has(userId)) return true;

    // Check pending requests (as requester or target)
    for (const pending of this.pendingRequests.values()) {
      if (pending.from === userId || pending.to === userId) return true;
    }

    return false;
  }

  /**
   * Get the pending request info by sessionId.
   */
  getPendingRequest(sessionId: string): PendingRequest | undefined {
    return this.pendingRequests.get(sessionId);
  }
}
