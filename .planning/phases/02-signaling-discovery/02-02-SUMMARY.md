---
phase: 02-signaling-discovery
plan: 02
subsystem: networking
tags: [websocket, ws, signaling, reconnect, presence, event-emitter]

requires:
  - phase: 02-signaling-discovery/01
    provides: "Protocol schemas, PresenceManager, GeoLocationService"
  - phase: 01-foundation
    provides: "Monorepo structure, shared types, constants"
provides:
  - "SignalingServer: WebSocket server with message routing, heartbeat, presence broadcasts"
  - "SignalingClient: EventEmitter client with auto-reconnect, heartbeat, typed events"
  - "Server entry point with graceful shutdown"
  - "Root dev scripts (concurrently) for server+client"
affects: [03-relay-chat, 05-p2p-upgrade]

tech-stack:
  added: [concurrently]
  patterns: [websocket-message-routing, exponential-backoff-with-jitter, event-emitter-client]

key-files:
  created:
    - packages/server/src/SignalingServer.ts
    - packages/server/src/index.ts
    - packages/client/src/network/SignalingClient.ts
    - packages/server/src/__tests__/SignalingServer.test.ts
    - packages/client/src/network/SignalingClient.test.ts
  modified:
    - package.json
    - packages/client/package.json

key-decisions:
  - "Default Seoul coords (37.5665, 126.9780) as fallback when geo lookup returns null for private IPs without DEV_GEO env"
  - "broadcastToRegistered sends to all registered clients (not geo-filtered) for USER_JOINED/LEFT simplicity; geo-filtering deferred to relay phase"
  - "ws package used in both server and client (isomorphic WebSocket)"

patterns-established:
  - "AliveWebSocket interface: extends WebSocket with isAlive/userId for connection tracking"
  - "Server port 0 in tests: dynamic port allocation avoids conflicts"
  - "MockWebSocket pattern: extend EventEmitter for client unit tests without network"

requirements-completed: [DISC-01, DISC-02, DISC-03, IDEN-03]

duration: 5min
completed: 2026-03-19
---

# Phase 02 Plan 02: WebSocket Networking Layer Summary

**SignalingServer with full message routing (register/heartbeat/nearby/presence) and SignalingClient with exponential backoff reconnect, heartbeat, and typed event emission**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T08:19:13Z
- **Completed:** 2026-03-19T08:24:05Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SignalingServer handles full WebSocket message lifecycle: register, heartbeat, get_nearby, update_radius with zod validation
- Server broadcasts USER_JOINED/USER_LEFT/USER_STATUS for real-time presence updates
- SignalingClient auto-reconnects with exponential backoff (500ms base, 30s cap, 0.5-1.5x jitter)
- Server entry point with graceful SIGINT/SIGTERM shutdown
- Root `npm run dev` starts server+client concurrently
- 19 new tests (7 integration + 12 unit), 107 total tests passing

## Task Commits

Each task was committed atomically (TDD: test -> feat):

1. **Task 1: SignalingServer** - `45ba5ee` (test: RED) -> `4b83b58` (feat: GREEN)
2. **Task 2: SignalingClient** - `6a225b6` (test: RED) -> `1d905b4` (feat: GREEN)

## Files Created/Modified
- `packages/server/src/SignalingServer.ts` - WebSocket server with message routing, heartbeat check, presence broadcasts
- `packages/server/src/index.ts` - Server entry point with PORT env parsing and graceful shutdown
- `packages/client/src/network/SignalingClient.ts` - EventEmitter client with connect/disconnect/reconnect/heartbeat
- `packages/server/src/__tests__/SignalingServer.test.ts` - 7 integration tests using real WebSocket connections
- `packages/client/src/network/SignalingClient.test.ts` - 12 unit tests with MockWebSocket
- `package.json` - Added concurrently, dev/dev:server/dev:client scripts
- `packages/client/package.json` - Added ws dependency, dev script

## Decisions Made
- Default Seoul coords as null-geo fallback: private IPs without DEV_GEO env vars still get valid coordinates
- broadcastToRegistered sends to all registered clients (simplified): geo-filtered broadcast deferred to relay phase
- ws package added to client dependencies for isomorphic WebSocket usage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added dev script to client package.json**
- **Found during:** Task 1
- **Issue:** Root `npm run dev` references `npm -w packages/client run dev` but client had no dev script
- **Fix:** Added `"dev": "tsx watch src/index.tsx"` to client package.json scripts
- **Files modified:** packages/client/package.json
- **Verification:** Script reference now resolves
- **Committed in:** 4b83b58

**2. [Rule 3 - Blocking] Added ws dependency to client package**
- **Found during:** Task 2
- **Issue:** SignalingClient imports from 'ws' but package not in client dependencies
- **Fix:** Added `ws: ^8.19.0` to dependencies, `@types/ws: ^8` to devDependencies
- **Files modified:** packages/client/package.json, package-lock.json
- **Verification:** Import resolves, all tests pass
- **Committed in:** 1d905b4

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for functionality. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WebSocket networking layer complete, ready for relay chat (Phase 3)
- SignalingServer and SignalingClient integrate with Plan 01's PresenceManager and protocol schemas
- Plan 03 (integration glue) can wire SignalingClient into the TUI

## Self-Check: PASSED

All 6 created files verified. All 4 commit hashes verified.

---
*Phase: 02-signaling-discovery*
*Completed: 2026-03-19*
