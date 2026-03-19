---
phase: 02-signaling-discovery
plan: 03
subsystem: ui
tags: [ink, react, websocket, hooks, tui-integration]

requires:
  - phase: 02-signaling-discovery/02-01
    provides: Protocol schemas, GeoLocationService, PresenceManager
  - phase: 02-signaling-discovery/02-02
    provides: SignalingServer, SignalingClient
provides:
  - React hooks for server connection and nearby users
  - Extended StatusBar with connection/radius/nearby count
  - Interactive UserList component with arrow key selection
  - ChatScreen integration with /users and Tab radius cycling
  - Multi-profile support for testing (CLING_TALK_PROFILE env)
affects: [phase-3-relay-chat, phase-4-friends]

tech-stack:
  added: []
  patterns: [react-hooks-for-networking, interactive-overlay-component]

key-files:
  created:
    - packages/client/src/hooks/useServerConnection.ts
    - packages/client/src/hooks/useNearbyUsers.ts
    - packages/client/src/ui/components/UserList.tsx
  modified:
    - packages/client/src/ui/components/StatusBar.tsx
    - packages/client/src/ui/screens/ChatScreen.tsx
    - packages/client/src/commands/CommandParser.ts
    - packages/client/src/config/AppConfig.ts
    - packages/server/src/index.ts
    - package.json

key-decisions:
  - "Removed tsx watch from both server and client — watch mode conflicts with Ink raw mode and causes unkillable processes"
  - "Added CLING_TALK_PROFILE env for multi-identity testing"
  - "Force exit timeout (2s) on server SIGINT/SIGTERM"
  - "Background server + foreground client for dev script (concurrently breaks TTY)"

patterns-established:
  - "React hooks pattern: useServerConnection wraps SignalingClient, useNearbyUsers subscribes to events"
  - "Interactive overlay: UserList renders over ChatScreen when /users active"
  - "Multi-profile testing via CLING_TALK_PROFILE env"

requirements-completed: [DISC-01, DISC-02, DISC-03, IDEN-03]

duration: 20min
completed: 2026-03-19
---

# Phase 2: Plan 03 Summary

**TUI integration — hooks, StatusBar, UserList, ChatScreen wiring with 6 dev environment fixes**

## Performance

- **Duration:** ~20 min (including manual checkpoint and 6 fix iterations)
- **Tasks:** 3 (2 automated + 1 manual checkpoint)
- **Files modified:** 10

## Accomplishments
- useServerConnection hook wraps SignalingClient with React state management
- useNearbyUsers hook subscribes to nearby_users and user_status events
- StatusBar extended with connection status, radius, nearby count
- Interactive UserList component with arrow key navigation
- ChatScreen integrates /users command and Tab radius cycling
- Two clients successfully discover each other via signaling server

## Task Commits

1. **Task 1: Hooks + StatusBar + UserList** - `ec2c025` (feat)
2. **Task 2: ChatScreen wiring** - `dabb91a` (feat)
3. **Task 3: Manual checkpoint fixes:**
   - `3becb34` - fix dev script (server background, client foreground)
   - `81cff4b` - remove tsx watch from client
   - `a3d91e8` - force exit timeout + remove server tsx watch
   - `36bcaf9` - add CLING_TALK_PROFILE for multi-identity testing

## Deviations from Plan

### Auto-fixed Issues

**1. concurrently breaks Ink raw mode**
- **Issue:** concurrently pipes stdin, Ink can't access TTY
- **Fix:** Server runs in background, client in foreground
- **Committed in:** 3becb34

**2. tsx watch conflicts with Ink**
- **Issue:** watch mode restarts process, resetting terminal state
- **Fix:** Removed watch from client dev script
- **Committed in:** 81cff4b

**3. Server won't terminate on Ctrl+C**
- **Issue:** tsx watch creates unkillable child processes
- **Fix:** Removed server watch + added 2s force exit timeout
- **Committed in:** a3d91e8

**4. Same identity for multiple clients**
- **Issue:** Both clients use same conf config, can't test /users
- **Fix:** CLING_TALK_PROFILE env for separate identities
- **Committed in:** 36bcaf9

---

**Total deviations:** 4 auto-fixed (dev environment issues)
**Impact on plan:** All fixes necessary for functional development environment. No scope creep.

## Known Issues
- #19: Server reconnecting status shows correctly (verified)
- Previous #8: Placeholder IME overlap (cosmetic, from Phase 1)

## Next Phase Readiness
- Server + client fully connected
- Discovery working (mutual user detection)
- Presence working (online/offline real-time)
- Ready for Phase 3: relay chat messaging

---
*Phase: 02-signaling-discovery*
*Completed: 2026-03-19*
