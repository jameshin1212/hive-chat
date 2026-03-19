---
name: ink-tui-components
description: |
  Patterns for building Ink 6 + React TUI components: scrollable lists with keyboard cycling, cursor position management in text inputs, overlay rendering, and CJK/IME-safe text handling.
  Use this skill whenever implementing or fixing: arrow key navigation in lists, text input cursor movement, autocomplete/suggestion menus, scrollable containers, or any Ink component that handles keyboard interaction. Also use when debugging visual glitches like items disappearing during scroll, cursor position being wrong, or focus getting lost between list items.
---

# Ink TUI Component Patterns

This skill encodes battle-tested patterns for Ink 6 TUI components. These patterns solve real bugs encountered in production — follow them to avoid the same pitfalls.

## Scrollable List with Keyboard Cycling

Lists that exceed visible height need scrolling. The key insight: **scroll position must be stable** — only adjust when the selected item leaves the visible range.

### The Pattern

```typescript
import { useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ScrollableListProps<T> {
  items: T[];
  selectedIndex: number;
  maxVisible?: number;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
}

function ScrollableList<T>({ items, selectedIndex, maxVisible = 8, renderItem }: ScrollableListProps<T>) {
  const scrollTopRef = useRef(0);
  const total = items.length;

  if (total <= maxVisible) {
    return <Box flexDirection="column">{items.map((item, i) => renderItem(item, i === selectedIndex))}</Box>;
  }

  // Reserve 2 lines for ↑↓ indicators — FIXED, not conditional
  const itemSlots = maxVisible - 2;
  let scrollTop = Math.max(0, Math.min(scrollTopRef.current, total - itemSlots));

  // Only adjust when selected escapes visible window
  if (selectedIndex < scrollTop) scrollTop = selectedIndex;
  else if (selectedIndex >= scrollTop + itemSlots) scrollTop = selectedIndex - itemSlots + 1;

  scrollTop = Math.max(0, Math.min(scrollTop, total - itemSlots));
  scrollTopRef.current = scrollTop;

  const endIndex = Math.min(scrollTop + itemSlots, total);
  const visible = items.slice(scrollTop, endIndex);

  return (
    <Box flexDirection="column">
      {scrollTop > 0 ? <Text dimColor>  ↑ {scrollTop} more</Text> : <Text> </Text>}
      {visible.map((item, i) => renderItem(item, scrollTop + i === selectedIndex))}
      {endIndex < total ? <Text dimColor>  ↓ {total - endIndex} more</Text> : <Text> </Text>}
    </Box>
  );
}
```

### Why This Works

- **`useRef` for scroll position**: useState would cause re-renders on every scroll adjustment. Ref keeps it stable.
- **Fixed indicator lines**: Reserving 2 lines always (even when at top/bottom) prevents layout jumping. When items disappear or appear between frames, the total height changes and Ink re-renders the entire region, causing visual glitches.
- **Minimal adjustment**: Only moving the window when selected escapes prevents the "centering jump" where the window re-centers on every arrow press.

### Common Bugs to Avoid

1. **Conditional indicator lines** cause items to appear/disappear between frames. Always render the indicator line (use empty `<Text> </Text>` as placeholder).
2. **Recalculating itemSlots per frame** based on `hasUp`/`hasDown` creates a feedback loop — the slot count changes, which changes what's visible, which changes `hasUp`/`hasDown`.
3. **Not clamping scrollTop** after wrap-around causes negative indices.

## Keyboard Navigation with Cycling

Arrow keys should wrap around at boundaries — stopping at the end feels broken.

```typescript
// Cycling navigation
if (key.upArrow) {
  setIndex(prev => prev <= 0 ? items.length - 1 : prev - 1);
}
if (key.downArrow) {
  setIndex(prev => prev >= items.length - 1 ? 0 : prev + 1);
}
```

Never use `Math.max(0, prev - 1)` / `Math.min(length - 1, prev + 1)` — this creates a dead stop at boundaries.

## Text Input Cursor Management

For text inputs that support cursor movement (not just append-at-end), use this pattern:

### Cursor State

```typescript
// Use ref to avoid React batching issues (critical for Korean IME)
const cursorPosRef = useRef(0);
const textRef = useRef('');
```

### Character-Level Operations

Always use `Array.from(text)` for character operations — `.split('')` breaks surrogate pairs and CJK characters.

```typescript
// Insert at cursor position
const chars = Array.from(textRef.current);
const inputChars = Array.from(input);
chars.splice(cursorPosRef.current, 0, ...inputChars);
textRef.current = chars.join('');
cursorPosRef.current += inputChars.length;

// Delete at cursor position (backspace)
if (cursorPosRef.current > 0) {
  const chars = Array.from(textRef.current);
  chars.splice(cursorPosRef.current - 1, 1);
  textRef.current = chars.join('');
  cursorPosRef.current -= 1;
}

// Move cursor
if (key.leftArrow) cursorPosRef.current = Math.max(0, cursorPosRef.current - 1);
if (key.rightArrow) cursorPosRef.current = Math.min(Array.from(textRef.current).length, cursorPosRef.current + 1);
```

### Visible Window with Cursor Tracking

When text exceeds terminal width, show a sliding window that always contains the cursor:

```typescript
import stringWidth from 'string-width';

function getVisibleWindow(text: string, maxWidth: number, cursorPos: number): { text: string; cursorOffset: number } {
  const chars = Array.from(text);
  if (stringWidth(text) <= maxWidth) return { text, cursorOffset: cursorPos };

  // Find window that contains cursor
  let start = 0;
  let width = 0;
  // First, include chars up to cursor
  for (let i = 0; i < Math.min(cursorPos, chars.length); i++) {
    width += stringWidth(chars[i]!);
  }
  // If cursor area exceeds maxWidth, slide start forward
  while (width > maxWidth && start < cursorPos) {
    width -= stringWidth(chars[start]!);
    start++;
  }
  // Fill remaining width after cursor
  let end = cursorPos;
  while (end < chars.length && width + stringWidth(chars[end]!) <= maxWidth) {
    width += stringWidth(chars[end]!);
    end++;
  }
  return {
    text: chars.slice(start, end).join(''),
    cursorOffset: cursorPos - start,
  };
}
```

### CJK Width Calculation

Always use `string-width` (not `.length`) for display width:
- ASCII: 1 column
- CJK (한글, 漢字): 2 columns
- Emoji: 2 columns

```typescript
import stringWidth from 'string-width';

const availableWidth = columns - stringWidth(PROMPT) - 1; // -1 for cursor character
```

## Key Intercept Pattern

When a parent component needs to intercept keys before the input field processes them (e.g., autocomplete stealing arrow keys):

```typescript
// Parent provides intercept callback
<IMETextInput
  onKeyIntercept={(input, key, setText) => {
    if (showSuggestions && key.downArrow) {
      // Handle it ourselves
      cycleSuggestion(+1);
      return true; // consumed — input field won't process this key
    }
    return false; // not consumed — input field processes normally
  }}
/>

// Input field checks intercept FIRST
useInput((input, key) => {
  if (onKeyIntercept?.(input, key, setText)) return; // intercepted
  // Normal input handling...
}, { isActive });
```

The boolean return is critical — it tells the input field whether the key was consumed.

## Overlay Rendering Order

Overlays (UserList, FriendList, autocomplete) should render **between the main content area and the status bar**, not replace the main content:

```
MessageArea (always renders, flexGrow)
  ↓
[Overlays — conditional]  ← UserList, FriendList, ChatRequest
[Autocomplete — conditional]
  ↓
Separator
StatusBar
Separator
InputField
```

Never conditionally replace MessageArea with an overlay — this causes the layout to jump between "content at top" and "content at bottom".

## useInput Best Practices

1. **Always pass `{ isActive }`** to prevent ghost handlers:
   ```typescript
   useInput(handler, { isActive: visible && !otherOverlay });
   ```

2. **Order matters**: Ink processes `useInput` hooks in registration order. The first hook that matches wins.

3. **Return early for inactive states**:
   ```typescript
   useInput((_input, key) => {
     if (!visible) return;
     // handle keys...
   }, { isActive: visible });
   ```
