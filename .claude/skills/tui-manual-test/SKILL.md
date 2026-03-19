---
name: tui-manual-test
description: |
  Checklist-based manual testing for Ink TUI apps. Generates test scenarios for visual rendering, keyboard navigation, scroll behavior, and CJK input.
  Use this skill after implementing or fixing TUI components — especially when automated tests pass but visual bugs may exist. Trigger when: user reports visual glitches, after modifying layout/render code, after changing keyboard handlers, or when the user asks to "test" or "verify" TUI behavior.
---

# TUI Manual Test Checklist Generator

Automated tests verify logic, but TUI bugs are often visual — things that "work" but look wrong. This skill generates targeted test checklists for manual verification.

## When to Use

Run this checklist after any change to:
- Layout structure (Box ordering, flexGrow, height calculations)
- Keyboard handlers (useInput, arrow keys, Enter, Escape)
- Text rendering (colors, inverse, dimColor, italic)
- Scroll behavior (MessageArea, CommandSuggestions, lists)
- Input field (cursor, IME, text insertion)

## Test Categories

### 1. Keyboard Navigation

For any component with arrow key selection:

```
[ ] Arrow down cycles from last item to first item
[ ] Arrow up cycles from first item to last item
[ ] Selected item is always visually highlighted
[ ] Enter on selected item triggers the correct action
[ ] Escape closes the overlay/menu
[ ] Arrow keys don't leak to other components (check isActive)
```

For scrollable lists (more items than visible):
```
[ ] All items are reachable by arrow keys (none skipped)
[ ] Scroll indicators (↑↓ more) appear when items are hidden
[ ] Scrolling is smooth — no items disappear between frames
[ ] Scroll position is stable — window doesn't jump on every key press
[ ] Wrap-around (last→first, first→last) scrolls correctly
```

### 2. Input Field

```
[ ] Left/right arrow moves cursor one character at a time
[ ] Cursor is visually visible at the correct position
[ ] Typing at cursor position inserts text (not appends to end)
[ ] Backspace deletes character before cursor
[ ] Korean IME: ㅎ+ㅏ+ㄴ composes to 한 (no flickering)
[ ] Long text: input scrolls horizontally, cursor always visible
[ ] Cursor at start of text: left arrow does nothing (no crash)
[ ] Cursor at end of text: right arrow does nothing (no crash)
```

### 3. Layout Consistency

```
[ ] StatusBar is always at bottom (above input field)
[ ] Separators are visible above and below StatusBar
[ ] MessageArea fills available space
[ ] Overlays (UserList, FriendList) appear above StatusBar, not at top
[ ] Terminal resize: layout adjusts correctly
[ ] No blank gaps between components
```

### 4. Message Rendering

```
[ ] System messages show as gray italic with ─ separators (no badge/nick)
[ ] Own messages have green text color
[ ] Partner messages have white/default text color
[ ] Timestamps show correctly [HH:MM]
[ ] AI CLI badges show with correct colors
[ ] Long messages wrap correctly (no horizontal overflow)
[ ] 50+ messages: scroll works, newest at bottom
```

### 5. Command Autocomplete

```
[ ] / triggers suggestion list immediately
[ ] Typing filters suggestions (/u → /users only)
[ ] No matches: suggestion list hides
[ ] Arrow keys select items in list
[ ] Enter fills command in input (doesn't execute immediately)
[ ] Escape closes suggestions, preserves input text
[ ] Suggestions appear above input field, not at screen top
[ ] All commands are accessible (none hidden between visible items)
```

### 6. Connection States

```
[ ] Connected (direct P2P): green "connected" text
[ ] Connected (relay): yellow "connected" text
[ ] Reconnecting: yellow text
[ ] Offline: red text
[ ] System message appears on connection change
```

## How to Generate a Checklist

When asked to test, identify which categories are affected by the recent change:

1. Read the git diff or changed files
2. Select relevant test categories
3. Present a focused checklist (not all categories — only relevant ones)
4. If the user reports a specific bug, add a regression test item for that exact scenario

## Regression Items

When fixing a specific bug, always add these items to future checklists:

```
[ ] [REGRESSION] {exact bug description from user report}
    Steps: {exact reproduction steps}
    Expected: {what should happen}
```

Keep a running list of regressions in the project's known issues.
