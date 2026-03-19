---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [ink, react, onboarding, korean-ime, integration]

requires:
  - phase: 01-foundation/01-02
    provides: TUI components (IMETextInput, ChatScreen, OnboardingScreen, StatusBar)
  - phase: 01-foundation/01-01
    provides: Identity system, CommandParser, theme, shared types
provides:
  - App.tsx screen routing (onboarding vs chat)
  - Full CLI entry point wiring
  - Korean IME manual verification
affects: [phase-2-signaling, phase-3-relay-chat]

tech-stack:
  added: []
  patterns: [screen-routing-via-state, identity-based-conditional-render]

key-files:
  created:
    - packages/client/src/ui/App.tsx
  modified:
    - packages/client/src/index.tsx
    - packages/client/src/ui/components/IMETextInput.tsx
    - packages/client/src/ui/screens/OnboardingScreen.tsx

key-decisions:
  - "Removed useCursor — causes terminal cursor to jump to top of Ink output"
  - "Visual block cursor (▏) instead of terminal cursor positioning"
  - "useRef as text source of truth to fix React batching race with Korean IME"
  - "allowEmpty prop for Enter-to-continue prompts"

patterns-established:
  - "Ref+State pattern: useRef for immediate reads, useState for renders"
  - "Screen routing via identity existence check in App.tsx"

requirements-completed: [IDEN-01, IDEN-02, TUI-01, TUI-02, TUI-04, DIST-01]

duration: 15min
completed: 2026-03-19
---

# Phase 1: Plan 03 Summary

**App wiring with screen routing, Korean IME checkpoint — 4 fix iterations for cursor/IME issues**

## Performance

- **Duration:** ~15 min (including manual checkpoint and 4 fix iterations)
- **Tasks:** 2 (1 automated + 1 manual checkpoint)
- **Files modified:** 4

## Accomplishments
- App.tsx wires all components: identity check → onboarding or chat screen
- Welcome back message for returning users
- Korean IME verified on macOS — single Enter submits including last composing char
- 4 critical IME/cursor bugs found and fixed during manual checkpoint

## Task Commits

1. **Task 1: App wiring + index.tsx** - `2236fab` (feat)
2. **Task 2: Manual checkpoint fixes:**
   - `e5ba65b` - fix cursor blinking at top, Enter not working
   - `59cd144` - rewrite IMETextInput for Korean IME (later reverted)
   - `737a181` - revert to useInput, fix stdin double-processing
   - `6da2004` - use ref for text state to fix Korean IME double-Enter

## Files Created/Modified
- `packages/client/src/ui/App.tsx` - Screen routing (onboarding vs chat)
- `packages/client/src/index.tsx` - Updated entry point with Ink render
- `packages/client/src/ui/components/IMETextInput.tsx` - Fixed cursor, IME, allowEmpty
- `packages/client/src/ui/screens/OnboardingScreen.tsx` - allowEmpty for welcome screen

## Decisions Made
- Removed `useCursor` hook — it positions cursor relative to Ink output top, not component
- Replaced with visual block cursor character (▏) — works reliably across terminals
- Used `useRef` alongside `useState` for text — Enter handler reads ref to avoid React batching race
- Korean IME placeholder overlap deferred as non-critical cosmetic issue

## Deviations from Plan

### Auto-fixed Issues

**1. [Cursor position] useCursor causes cursor to blink at top of screen**
- **Found during:** Manual checkpoint
- **Issue:** useCursor's setCursorPosition({x, y:0}) set cursor at Ink output top
- **Fix:** Removed useCursor, used visual block cursor character instead
- **Committed in:** e5ba65b

**2. [Enter key] Welcome screen Enter not working**
- **Found during:** Manual checkpoint
- **Issue:** onSubmit only fired when text.trim() was truthy; empty Enter ignored
- **Fix:** Added allowEmpty prop to IMETextInput
- **Committed in:** e5ba65b

**3. [stdin conflict] Raw stdin handler caused character scattering**
- **Found during:** Manual checkpoint
- **Issue:** Custom stdin.on('data') handler conflicted with Ink's internal stdin
- **Fix:** Reverted to Ink's useInput, removed raw stdin approach
- **Committed in:** 737a181

**4. [Korean IME] Last composing char lost on Enter (double-Enter needed)**
- **Found during:** Manual checkpoint
- **Issue:** React state batching — setState for last char not committed when Enter handler runs
- **Fix:** useRef as source of truth; Enter reads textRef.current
- **Committed in:** 6da2004

---

**Total deviations:** 4 auto-fixed (cursor, Enter, stdin conflict, IME batching)
**Impact on plan:** All fixes necessary for Korean IME usability. No scope creep.

## Known Issues (Deferred)
- #8: Placeholder text visible behind IME composing character (cosmetic)

## Issues Encountered
- Korean IME in terminal raw mode is fundamentally challenging — IME composition happens at OS level, not app level
- Attempted raw stdin approach but it conflicted with Ink's rendering pipeline

## Next Phase Readiness
- Full TUI shell complete and verified
- Identity system working (create, persist, load)
- Ready for Phase 2: signaling server + discovery

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
