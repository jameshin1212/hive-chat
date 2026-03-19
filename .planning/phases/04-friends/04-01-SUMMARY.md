---
phase: 04-friends
plan: 01
subsystem: protocol, server, client
tags: [zod, friends, presence, subscription, conf-storage]

requires:
  - phase: 03-relay-chat
    provides: SignalingServer, PresenceManager, protocol.ts chat schemas, SignalingClient, CommandParser
provides:
  - 3 friend message zod schemas (1 client, 2 server) in shared protocol
  - parseNickTag utility and FriendRecord type in shared types
  - FriendManager with add/remove/list/check using conf persistence
  - Server friend status query/response and push updates on join/leave
  - SignalingClient requestFriendStatus method and friend event emitters
  - /addfriend and /removefriend commands in CommandParser
affects: [04-friends plan 02 (TUI integration)]

tech-stack:
  added: []
  patterns: [friend-subscription-map, push-notification-on-presence-change, conf-array-storage]

key-files:
  created:
    - packages/client/src/friends/FriendManager.ts
    - packages/client/src/friends/FriendManager.test.ts
    - packages/shared/src/__tests__/friendProtocol.test.ts
    - packages/server/src/__tests__/FriendStatus.test.ts
  modified:
    - packages/shared/src/types.ts
    - packages/shared/src/protocol.ts
    - packages/client/src/config/AppConfig.ts
    - packages/server/src/SignalingServer.ts
    - packages/client/src/network/SignalingClient.ts
    - packages/client/src/commands/CommandParser.ts

key-decisions:
  - "friendSubscriptions Map keyed by userId for O(1) subscription lookup"
  - "notifyFriendSubscribers iterates all subscribers on join/leave (acceptable for small user counts)"
  - "FriendManager uses simple append (no dedup) — caller handles duplicate check"

patterns-established:
  - "friendSubscriptions: Map<userId, friends[]> for tracking who watches whom"
  - "Push updates via notifyFriendSubscribers on register/disconnect events"
  - "parseNickTag with last # separator for nickname#TAG format"

requirements-completed: [SOCL-01, SOCL-02]

duration: 5min
completed: 2026-03-19
---

# Phase 4 Plan 1: Friend Protocol & Backend Summary

**Friend system foundation with 3 protocol schemas, FriendManager conf storage, server push updates, and client event integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T12:07:25Z
- **Completed:** 2026-03-19T12:12:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- 3 friend message types (FRIEND_STATUS_REQUEST, FRIEND_STATUS_RESPONSE, FRIEND_STATUS_UPDATE) with zod schemas integrated into discriminated unions
- parseNickTag utility handles nick#TAG parsing with last-# separator and uppercase hex validation
- FriendManager provides add/remove/list/check with conf persistence via appConfig
- Server tracks friendSubscriptions and responds to status queries with online/offline/unknown
- Server pushes FRIEND_STATUS_UPDATE when tracked friends join or leave
- Subscription cleanup on disconnect prevents memory leaks
- SignalingClient emits friend_status_response and friend_status_update events
- CommandParser extended with /addfriend and /removefriend commands

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared types, protocol schemas, FriendManager, and tests** - `f21793d` (feat) - TDD: 33 tests
2. **Task 2: Server friend status handlers, SignalingClient methods, CommandParser** - `dc63219` (feat) - TDD: 5 integration tests

## Files Created/Modified
- `packages/shared/src/types.ts` - NICK_TAG_REGEX, parseNickTag, FriendRecord interface
- `packages/shared/src/protocol.ts` - 3 friend message schemas added to discriminated unions
- `packages/client/src/config/AppConfig.ts` - Conf generic expanded with friends?: FriendRecord[]
- `packages/client/src/friends/FriendManager.ts` - addFriend, removeFriend, getFriends, isFriend
- `packages/server/src/SignalingServer.ts` - friendSubscriptions, handleFriendStatusRequest, notifyFriendSubscribers
- `packages/client/src/network/SignalingClient.ts` - requestFriendStatus method, friend event handlers
- `packages/client/src/commands/CommandParser.ts` - /addfriend and /removefriend commands
- `packages/shared/src/__tests__/friendProtocol.test.ts` - 22 schema validation + parseNickTag tests
- `packages/client/src/friends/FriendManager.test.ts` - 11 FriendManager CRUD tests
- `packages/server/src/__tests__/FriendStatus.test.ts` - 5 server integration tests

## Decisions Made
- friendSubscriptions Map keyed by userId for O(1) subscription lookup
- notifyFriendSubscribers iterates all subscribers on join/leave (acceptable for small user counts)
- FriendManager uses simple append (no dedup) -- caller handles duplicate check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All friend data contracts and backend logic ready for Plan 02 TUI integration
- FriendManager API stable for friend list panel component
- Server push updates ready for real-time friend status display

---
*Phase: 04-friends*
*Completed: 2026-03-19*
