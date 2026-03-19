---
name: cling-talk-dev
description: |
  Cling Talk project architecture, component relationships, state flow, and development conventions.
  Use this skill whenever working on the Cling Talk codebase — modifying components, fixing bugs, adding features, or understanding how pieces connect. Also use when: debugging event flow issues, understanding the relay/P2P abstraction, tracing message delivery, or figuring out where to add new functionality.
---

# Cling Talk Development Guide

## Architecture Overview

```
packages/
  shared/    → Protocol types + zod schemas + constants (imported by both)
  client/    → CLI app (npm published, npx cling-talk)
  server/    → Lightweight signaling server
```

Import rules: client→shared OK, server→shared OK, client↔server FORBIDDEN.

## Component Tree

```
App
└── ChatScreen (main orchestrator)
    ├── MessageArea          (flexGrow, scrollable, Page Up/Down)
    ├── [UserList]           (overlay, conditional)
    ├── [FriendList]         (overlay, conditional)
    ├── [ChatRequestOverlay] (overlay, conditional)
    ├── [CommandSuggestions]  (overlay, conditional)
    ├── Separator
    ├── StatusBar            (fixed, 1 line)
    ├── Separator
    └── IMETextInput         (fixed, 1 line)
```

Layout height: `messageAreaHeight = rows - 4` (StatusBar + 2 separators + input)

## State Flow

### Input → Action Pipeline

```
IMETextInput
  → onTextChange(text)     → ChatScreen.handleTextChange
                               → filterCommands(text) if starts with /
                               → setShowSuggestions / setSuggestionIndex
  → onKeyIntercept(key)    → ChatScreen.handleKeyIntercept
                               → Autocomplete arrow/enter/escape handling
                               → Returns true if consumed
  → onSubmit(text)          → ChatScreen.handleSubmit
                               → parseInput(text)
                               → Command dispatch or sendMessage
```

### Network → UI Pipeline

```
SignalingClient (WebSocket)
  → ConnectionManager (EventEmitter proxy)
    → useServerConnection hook
      → status, transportType state
    → useChatSession hook
      → chatMessages, partner, incomingRequest state
    → useNearbyUsers hook
      → users, radiusKm state
```

### Key State Locations

| State | Location | Purpose |
|-------|----------|---------|
| `messages` | ChatScreen useState | Chat message buffer (max 500) |
| `showSuggestions` | ChatScreen useState | Autocomplete visibility |
| `suggestionIndex` | ChatScreen useState | Selected autocomplete item |
| `currentInput` | ChatScreen useState | Current input text (for filtering) |
| `scrollOffset` | MessageArea useState | Message scroll position |
| `cursorPosRef` | IMETextInput useRef | Cursor position in input |
| `textRef` | IMETextInput useRef | Current input text (ref for IME) |
| `scrollTopRef` | CommandSuggestions useRef | Scroll position in list |

## Key Files Quick Reference

| File | What it does | When to modify |
|------|-------------|----------------|
| `ChatScreen.tsx` | Main screen, all state orchestration | Adding commands, changing layout |
| `IMETextInput.tsx` | Text input with IME + cursor | Input behavior, cursor movement |
| `MessageArea.tsx` | Message display + scroll | Message rendering, scroll behavior |
| `CommandSuggestions.tsx` | Autocomplete dropdown | Suggestion UI, scroll behavior |
| `StatusBar.tsx` | Connection/identity display | Status information changes |
| `UserList.tsx` | Nearby users overlay | User list display/selection |
| `FriendList.tsx` | Friends overlay | Friend list display/selection |
| `CommandParser.ts` | Command definitions + parsing | Adding/removing commands |
| `theme.ts` | Color definitions | Changing colors/styles |
| `ConnectionManager.ts` | Relay/P2P abstraction | Network transport changes |
| `SignalingClient.ts` | WebSocket to server | Server protocol changes |
| `HyperswarmTransport.ts` | P2P direct connections | P2P behavior changes |

## Conventions

### Text Width
Always use `string-width` (not `.length`) for display width calculations. CJK = 2 columns, ASCII = 1, emoji = 2.

### Character Operations
Always use `Array.from(text)` for character-level operations. Never use `.split('')` — it breaks surrogate pairs.

### IME Safety
Use `useRef` for text state that Korean IME composition depends on. React `useState` batching causes race conditions during IME composition.

### Message Types
System messages use `from.nickname === 'system'` with tag `'0000'`. Check this in MessageArea for special rendering.

### Adding a New Command

1. Add to `COMMANDS` in `CommandParser.ts`
2. Add handler in `ChatScreen.tsx` `handleSubmit` under `parsed.type === 'command'`
3. Update `CommandParser.test.ts`

### Adding a New Overlay

1. Create component following UserList/FriendList pattern (useInput with isActive)
2. Add state in ChatScreen (`showXxx`, `setShowXxx`)
3. Render between MessageArea and CommandSuggestions in JSX
4. Add `!showXxx` to IMETextInput's `isActive` prop

## Common Pitfalls

1. **Forgetting `isActive` on useInput**: Causes ghost key handlers that intercept keys when component is not visible
2. **Using `.length` for CJK text width**: Korean characters are 2 columns wide, `.length` counts code points
3. **Conditional Box heights**: Ink recalculates layout on every render — conditional children cause flicker
4. **useState for rapid-fire updates**: Korean IME sends multiple events in quick succession — useState batches and loses intermediate states. Use useRef.
5. **Replacing MessageArea with overlays**: Causes layout jump. Overlays should render between MessageArea and StatusBar, not instead of MessageArea.
