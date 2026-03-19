---
phase: 02-signaling-discovery
plan: 01
subsystem: protocol, server
tags: [zod, websocket, geoip-lite, haversine, presence, heartbeat]

requires:
  - phase: 01-foundation
    provides: shared types (Identity, AiCli, AI_CLI_OPTIONS), zod schemas, monorepo structure
provides:
  - WebSocket protocol schemas (10 message types) with zod validation
  - GeoLocationService for IP geolocation and haversine distance
  - PresenceManager for user registry with heartbeat-based stale detection
  - Server package (@cling-talk/server) scaffolded in monorepo
affects: [02-signaling-discovery, 03-chat-relay]

tech-stack:
  added: [geoip-lite, haversine, ws, tsx, tsdown]
  patterns: [protocol-first zod schemas, discriminated union message parsing, dev fallback for private IPs]

key-files:
  created:
    - packages/shared/src/protocol.ts
    - packages/shared/src/protocol.test.ts
    - packages/server/package.json
    - packages/server/tsconfig.json
    - packages/server/src/types.ts
    - packages/server/src/GeoLocationService.ts
    - packages/server/src/PresenceManager.ts
    - packages/server/src/__tests__/GeoLocationService.test.ts
    - packages/server/src/__tests__/PresenceManager.test.ts
  modified:
    - packages/shared/src/constants.ts
    - packages/shared/src/index.ts
    - package-lock.json

key-decisions:
  - "geoip-lite dev fallback via DEV_GEO_LAT/DEV_GEO_LON env vars for localhost development"
  - "PresenceManager terminates old WebSocket on duplicate session registration"
  - "findNearbyUsers excludes offline users and rounds distance to 1 decimal"

patterns-established:
  - "Protocol-first: all message types defined as zod schemas in shared/protocol.ts"
  - "Discriminated union on 'type' field for client/server message parsing"
  - "Server services as pure functions (GeoLocationService) or stateful classes (PresenceManager)"

requirements-completed: [DISC-01, DISC-02, IDEN-03]

duration: 4min
completed: 2026-03-19
---

# Phase 02 Plan 01: Protocol & Server Services Summary

**Zod-validated WebSocket protocol (10 message types) with GeoLocationService (IP lookup + haversine) and PresenceManager (heartbeat-based stale detection at 60s)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T08:12:33Z
- **Completed:** 2026-03-19T08:16:58Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- 10 WebSocket message types defined with zod schemas and discriminated unions for type-safe parsing
- GeoLocationService: IP normalization, geoip lookup with dev fallback, haversine distance calculation, nearby user filtering sorted by distance
- PresenceManager: user registry, heartbeat tracking, stale detection (60s timeout), duplicate session handling, nearby user querying
- Server package scaffolded and linked in npm workspace monorepo

## Task Commits

Each task was committed atomically:

1. **Task 1: Protocol schemas + server package scaffolding** - `1da57f2` (feat)
2. **Task 2: GeoLocationService + PresenceManager with tests** - `862e21d` (feat)

## Files Created/Modified
- `packages/shared/src/protocol.ts` - All 10 WebSocket message schemas with zod validation
- `packages/shared/src/protocol.test.ts` - 28 protocol validation tests
- `packages/shared/src/constants.ts` - Server constants (port, heartbeat, stale timeout, radius)
- `packages/shared/src/index.ts` - Added protocol.js export
- `packages/server/package.json` - @cling-talk/server package definition
- `packages/server/tsconfig.json` - TypeScript config for server package
- `packages/server/src/types.ts` - UserRecord, GeoResult types
- `packages/server/src/GeoLocationService.ts` - IP lookup + distance calculation
- `packages/server/src/PresenceManager.ts` - User registry + heartbeat management
- `packages/server/src/__tests__/GeoLocationService.test.ts` - 15 geo service tests
- `packages/server/src/__tests__/PresenceManager.test.ts` - 12 presence manager tests

## Decisions Made
- DEV_GEO_LAT/DEV_GEO_LON env vars for localhost IP fallback -- enables development without public IP
- PresenceManager.register terminates old WebSocket on duplicate ID -- prevents ghost sessions
- findNearbyUsers filters offline users and rounds distance to 1 decimal -- clean UX data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Protocol schemas ready for SignalingServer (Plan 02) to consume
- GeoLocationService and PresenceManager ready for integration into WebSocket handler
- Server package linked in workspace, dependencies installed

## Self-Check: PASSED

All 9 created files verified. Both task commits (1da57f2, 862e21d) confirmed in git log. 88 tests passing across all packages.

---
*Phase: 02-signaling-discovery*
*Completed: 2026-03-19*
