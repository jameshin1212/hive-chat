# Roadmap: Double Talk

## Overview

Double Talk delivers terminal-native P2P chat in five phases. Phase 1 establishes the project foundation with identity system and TUI shell (validating CJK IME early to avoid costly rewrites). Phase 2 stands up the signaling server with geolocation-based discovery. Phase 3 delivers the core product -- working chat via server relay. Phase 4 adds the friend system for location-independent connections. Phase 5 upgrades to direct P2P messaging with Hyperswarm, adding connection health UI and NAT traversal for remote friends.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, identity system, TUI shell with CJK input validation
- [ ] **Phase 2: Signaling & Discovery** - Signaling server, IP geolocation, nearby user discovery, presence
- [ ] **Phase 3: Relay Chat** - End-to-end chat via server relay, ephemeral messages, notifications
- [ ] **Phase 4: Friends** - Friend add/remove by nick#tag, persistent friend list
- [ ] **Phase 5: P2P Upgrade** - Hyperswarm direct connections, NAT traversal, connection status UI

## Phase Details

### Phase 1: Foundation
**Goal**: Runnable CLI that displays a TUI with working Korean/CJK input, generates and stores nick#tag identity, and is distributable via npx
**Depends on**: Nothing (first phase)
**Requirements**: IDEN-01, IDEN-02, TUI-01, TUI-02, TUI-04, DIST-01
**Success Criteria** (what must be TRUE):
  1. User runs `npx double-talk` and sees a TUI with split layout (message area + input area)
  2. First-time user is prompted for nickname and receives auto-generated nick#tag identity that persists across sessions
  3. User can select their AI CLI tool (Claude Code, Codex, Gemini, Cursor) and it displays as a badge
  4. User can type Korean/CJK characters in the input area without composition glitches (no invisible chars, no garbled output)
  5. User can exit cleanly with Ctrl+C or /quit
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Signaling & Discovery
**Goal**: Users can discover nearby developers through a signaling server that tracks location and presence
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, IDEN-03
**Success Criteria** (what must be TRUE):
  1. Client connects to signaling server via WebSocket and registers with nick#tag identity
  2. Server determines user location from IP address and returns nearby users within selected radius (1/3/5/10km)
  3. User can change discovery radius and see updated nearby user list
  4. Online/offline status of other users updates in real-time (within heartbeat interval)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Relay Chat
**Goal**: Users can chat with nearby users end-to-end, with messages relayed through the signaling server
**Depends on**: Phase 2
**Requirements**: MESG-01, MESG-02, MESG-03, SOCL-04
**Success Criteria** (what must be TRUE):
  1. User can select a nearby user from the discovery list and start a 1:1 chat session
  2. Messages appear in real-time on both sides, displayed only in the terminal (no persistence)
  3. When connection drops, client auto-reconnects and chat resumes without user intervention
  4. User receives terminal bell/notification when a new message arrives while not focused on chat
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Friends
**Goal**: Users can add friends by nick#tag and maintain a persistent contact list independent of location
**Depends on**: Phase 3
**Requirements**: SOCL-01, SOCL-02
**Success Criteria** (what must be TRUE):
  1. User can add a friend by entering their nick#tag, regardless of physical proximity
  2. User can remove friends from their list
  3. Friend list persists across sessions (stored in local file)
  4. Friends' online/offline status is visible in the friend list
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: P2P Upgrade
**Goal**: Chat connections upgrade to direct P2P when possible, with transparent relay fallback and visible connection health
**Depends on**: Phase 4
**Requirements**: TUI-03, SOCL-03
**Success Criteria** (what must be TRUE):
  1. When two users can establish direct connection, messages flow P2P without server relay
  2. When NAT traversal fails, chat transparently falls back to relay (user sees status change, not an error)
  3. Connection status indicator shows current mode: direct / relay / disconnected
  4. Remote friends (different network/city) can chat via P2P with NAT traversal or relay fallback
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Signaling & Discovery | 0/2 | Not started | - |
| 3. Relay Chat | 0/2 | Not started | - |
| 4. Friends | 0/1 | Not started | - |
| 5. P2P Upgrade | 0/2 | Not started | - |
