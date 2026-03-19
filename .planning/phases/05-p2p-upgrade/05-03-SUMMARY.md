---
phase: 05-p2p-upgrade
plan: 03
subsystem: ui
tags: [ink, react, hyperswarm, connectionmanager, statusbar, tsdown]

# Dependency graph
requires:
  - phase: 05-p2p-upgrade plan 02
    provides: ConnectionManager transport abstraction, HyperswarmTransport
provides:
  - ConnectionManager wired into React hooks (useServerConnection, useChatSession)
  - StatusBar transport-aware colors (green=direct, yellow=relay, red=offline)
  - tsdown build with Hyperswarm native deps externalized
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ConnectionManager as primary client interface replacing direct SignalingClient usage
    - Transport color mapping (direct=green, relay=yellow) in StatusBar

key-files:
  created:
    - packages/client/src/ui/components/StatusBar.test.ts
  modified:
    - packages/client/src/hooks/useServerConnection.ts
    - packages/client/src/hooks/useChatSession.ts
    - packages/client/src/hooks/useFriends.ts
    - packages/client/src/hooks/useNearbyUsers.ts
    - packages/client/src/ui/components/StatusBar.tsx
    - packages/client/src/ui/screens/ChatScreen.tsx
    - packages/client/package.json

key-decisions:
  - "Text label stays 'connected' for both direct and relay -- only color changes"
  - "No system messages in chat area during transport transitions"
  - "connectionColor defaults to yellow when transportType undefined (backward compat)"
  - "Error event handler added to ConnectionManager to prevent unhandled crash"

patterns-established:
  - "Transport color convention: green=direct P2P, yellow=relay, red=offline"

requirements-completed: [TUI-03, SOCL-03]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 5 Plan 3: Client Integration Summary

**ConnectionManager wired into hooks with transport-aware StatusBar colors (green=direct, yellow=relay) and Hyperswarm externalized from tsdown build**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T14:00:00Z
- **Completed:** 2026-03-19T14:26:52Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- useServerConnection creates ConnectionManager wrapping SignalingClient, exposes transportType state
- useChatSession, useFriends, useNearbyUsers updated to accept ConnectionManager type
- StatusBar connectionColor function shows green for direct P2P, yellow for relay, red for offline
- StatusBar unit tests cover all transport/status color combinations
- tsdown build excludes Hyperswarm native dependencies (hyperswarm, b4a, hypercore-crypto)
- Manual E2E verification passed: relay mode yellow, chat works, Korean input works

## Task Commits

Each task was committed atomically:

1. **Task 1: StatusBar transport color tests + hook wiring + StatusBar colors** - `f3c9c15` (test: failing tests), `909fc7b` (feat: implementation)
2. **Task 2: tsdown external config for Hyperswarm** - `53d231f` (chore)
3. **Task 3: E2E manual verification** - checkpoint, user approved

**Auto-fix commit:** `a98fc96` (fix: error event handler on ConnectionManager)

## Files Created/Modified
- `packages/client/src/ui/components/StatusBar.test.ts` - Unit tests for transport color logic
- `packages/client/src/hooks/useServerConnection.ts` - Creates ConnectionManager, exposes transportType
- `packages/client/src/hooks/useChatSession.ts` - Updated to use ConnectionManager type
- `packages/client/src/hooks/useFriends.ts` - Updated to use ConnectionManager type
- `packages/client/src/hooks/useNearbyUsers.ts` - Updated to use ConnectionManager type
- `packages/client/src/ui/components/StatusBar.tsx` - Transport-aware connectionColor (green/yellow/red)
- `packages/client/src/ui/screens/ChatScreen.tsx` - Threads transportType from hook to StatusBar
- `packages/client/package.json` - tsdown --external flags for Hyperswarm deps

## Decisions Made
- Text label stays 'connected' for both direct and relay -- only the color changes (per user decision)
- No system messages in chat area during transport transitions
- connectionColor defaults to yellow when transportType is undefined (backward compat)
- Added error event handler on ConnectionManager to prevent unhandled EventEmitter crash

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added error event handler on ConnectionManager**
- **Found during:** Task 1
- **Issue:** ConnectionManager EventEmitter had no error listener, causing unhandled error crash
- **Fix:** Added `.on('error', ...)` handler in useServerConnection cleanup
- **Files modified:** packages/client/src/hooks/useServerConnection.ts
- **Verification:** No crash on connection errors
- **Committed in:** a98fc96

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for stability. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 complete: all 3 plans executed
- Full P2P upgrade system operational: relay-first with background P2P upgrade
- All v1 requirements fulfilled (18/18)
- Project ready for distribution or v2 planning

## Self-Check: PASSED

All 6 source files verified present. All 4 task commits verified in git log.

---
*Phase: 05-p2p-upgrade*
*Completed: 2026-03-19*
