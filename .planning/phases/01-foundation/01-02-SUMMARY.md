---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [ink, react, ime, cjk, string-width, useCursor, figlet, tui]

# Dependency graph
requires:
  - phase: 01-foundation/01
    provides: "Shared types, Identity CRUD, CommandParser, theme, monorepo"
provides:
  - "IMETextInput: CJK-aware text input with useCursor + string-width"
  - "ChatScreen: split layout (StatusBar + MessageArea + IMETextInput)"
  - "OnboardingScreen: 3-step wizard (banner -> nickname -> AI CLI)"
  - "StatusBar: identity badge with AI CLI color"
  - "MessageArea: scrollable message list with user colors"
  - "AsciiBanner: figlet ASCII art"
  - "AiCliSelector: arrow-key AI CLI selection"
  - "useGracefulExit: clean exit with cursor restore"
affects: [01-03, 02-signal-server, 03-relay-chat]

# Tech tracking
tech-stack:
  added: []
  patterns: [useCursor-ime-input, string-width-cursor-calc, split-layout-flexbox, figlet-module-level-generation]

key-files:
  created:
    - packages/client/src/ui/components/IMETextInput.tsx
    - packages/client/src/ui/components/IMETextInput.test.tsx
    - packages/client/src/ui/components/MessageArea.tsx
    - packages/client/src/ui/components/StatusBar.tsx
    - packages/client/src/ui/components/AsciiBanner.tsx
    - packages/client/src/ui/components/AiCliSelector.tsx
    - packages/client/src/ui/screens/ChatScreen.tsx
    - packages/client/src/ui/screens/OnboardingScreen.tsx
    - packages/client/src/hooks/useGracefulExit.ts
  modified: []

key-decisions:
  - "figlet.textSync at module level for zero runtime cost"
  - "Array.from for backspace to handle surrogate pairs correctly"
  - "Message sender color assignment based on unique sender order"

patterns-established:
  - "IME input: useCursor + string-width, never .length or ink-text-input"
  - "Split layout: Box flexDirection=column with flexGrow=1 for message area"
  - "Graceful exit: useApp().exit() + 2s force timeout with cursor restore"

requirements-completed: [TUI-01, TUI-02]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 01 Plan 02: TUI Components Summary

**CJK-aware IMETextInput with useCursor + string-width, split-layout ChatScreen, 3-step OnboardingScreen, and all supporting UI components**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T06:42:53Z
- **Completed:** 2026-03-19T06:45:43Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- IMETextInput with correct CJK cursor positioning via string-width (7 unit tests)
- Split-layout ChatScreen: StatusBar top, MessageArea (flexGrow), IMETextInput bottom
- 3-step OnboardingScreen with nickname validation and AI CLI arrow-key selector
- Graceful exit via Ctrl+C and /quit with terminal cursor restore

## Task Commits

Each task was committed atomically:

1. **Task 1: IME-aware TextInput component (TDD)** - `b952377` (feat)
2. **Task 2: Chat layout, onboarding, and remaining UI components** - `29ec969` (feat)

## Files Created/Modified
- `packages/client/src/ui/components/IMETextInput.tsx` - CJK-aware text input with useCursor + string-width
- `packages/client/src/ui/components/IMETextInput.test.tsx` - 7 cursor calculation tests (ASCII, CJK, mixed, emoji)
- `packages/client/src/ui/components/MessageArea.tsx` - Scrollable message list with user colors
- `packages/client/src/ui/components/StatusBar.tsx` - Identity badge + connection status
- `packages/client/src/ui/components/AsciiBanner.tsx` - figlet ASCII art with fallback
- `packages/client/src/ui/components/AiCliSelector.tsx` - Arrow-key AI CLI selector
- `packages/client/src/ui/screens/ChatScreen.tsx` - Main split layout with command handling
- `packages/client/src/ui/screens/OnboardingScreen.tsx` - 3-step onboarding wizard
- `packages/client/src/hooks/useGracefulExit.ts` - Clean exit with cursor restore

## Decisions Made
- Used figlet.textSync at module level for zero runtime cost (ASCII art generated once at import)
- Used Array.from for backspace to correctly handle surrogate pairs and CJK characters
- Message sender color assigned by unique sender appearance order

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All TUI components ready for wiring in Plan 03 (App.tsx routing)
- ChatScreen handles local messages and slash commands
- OnboardingScreen saves identity via IdentityManager
- Phase 2 networking can plug into ChatScreen's message state

## Self-Check: PASSED

- All 9 files: FOUND
- Commit b952377: FOUND
- Commit 29ec969: FOUND
- Tests: 33/33 passing

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
