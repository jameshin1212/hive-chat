---
phase: 08-visual-polish
plan: 02
subsystem: client-ui
tags: [tui, layout, commands, ux]
dependency_graph:
  requires: []
  provides: [statusbar-relocation, exit-command]
  affects: [ChatScreen, CommandParser]
tech_stack:
  added: []
  patterns: [jsx-layout-reorder]
key_files:
  created: []
  modified:
    - packages/client/src/commands/CommandParser.ts
    - packages/client/src/ui/screens/ChatScreen.tsx
decisions:
  - "/exit replaces /quit as the application exit command"
  - "StatusBar positioned between MessageArea and IMETextInput with separators"
metrics:
  duration: "1.3min"
  completed: "2026-03-19"
---

# Phase 08 Plan 02: StatusBar Relocation + /exit Command Summary

StatusBar relocated from top to input-adjacent position, /quit renamed to /exit for intuitive exit UX.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | /quit to /exit command rename | 70a4081 | Done |
| 2 | StatusBar relocation below MessageArea | 4436308 | Done |

## Changes Made

### Task 1: /quit to /exit command rename
- Changed COMMANDS key `'/quit'` to `'/exit'` in CommandParser.ts
- Updated ChatScreen.tsx handler from `parsed.name === '/quit'` to `parsed.name === '/exit'`
- /help output now shows /exit automatically (COMMANDS object-driven)

### Task 2: StatusBar relocation below MessageArea
- Moved StatusBar from top of layout (above MessageArea) to below MessageArea
- Final JSX order: MessageArea/lists -> ChatRequestOverlay -> CommandSuggestions -> separator -> StatusBar -> separator -> IMETextInput
- messageAreaHeight calculation unchanged (rows - 4)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: No new errors (pre-existing hyperswarm type errors only)
- /exit present in CommandParser.ts, /quit removed
- StatusBar positioned at line 319, IMETextInput at line 332 in ChatScreen.tsx
- messageAreaHeight = rows - 4 preserved

## Self-Check: PASSED
