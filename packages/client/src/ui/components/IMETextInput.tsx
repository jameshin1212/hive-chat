import React, { useState, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Key } from 'ink';
import stringWidth from 'string-width';
import { DEFAULT_TERMINAL_WIDTH } from '@cling-talk/shared';
import { theme } from '../theme.js';

const PROMPT = '> ';

/**
 * Calculate cursor X position using string-width for CJK-correct positioning.
 * CRITICAL: Never use .length — CJK characters are 2-column wide.
 */
export function calcCursorX(text: string, prompt: string = PROMPT): number {
  return stringWidth(prompt + text);
}

/**
 * Calculate the visible window of text that includes the cursor position.
 * Returns the visible text, the window start index (in char units), and
 * the cursor's column offset within the visible window.
 */
export function getVisibleWindow(
  text: string,
  availableWidth: number,
  cursorPosition: number,
): { visibleText: string; windowStart: number; cursorOffset: number } {
  if (availableWidth <= 0) return { visibleText: '', windowStart: 0, cursorOffset: 0 };

  const chars = Array.from(text);
  const totalWidth = stringWidth(text);

  if (totalWidth <= availableWidth) {
    // Everything fits — calculate cursor offset
    const beforeCursor = chars.slice(0, cursorPosition).join('');
    return {
      visibleText: text,
      windowStart: 0,
      cursorOffset: stringWidth(beforeCursor),
    };
  }

  // Clamp cursor position
  const clampedCursor = Math.max(0, Math.min(chars.length, cursorPosition));

  // Calculate column widths for prefix up to cursor
  const beforeCursorText = chars.slice(0, clampedCursor).join('');
  const cursorCol = stringWidth(beforeCursorText);

  // Also calculate width including the char AT cursor (if not at end)
  // so we ensure the cursor character itself is visible
  let cursorCharWidth = 0;
  if (clampedCursor < chars.length) {
    cursorCharWidth = stringWidth(chars[clampedCursor]!);
  }
  const cursorRightEdge = cursorCol + cursorCharWidth;

  // Determine window start: ensure cursor + its character fit in window
  let windowStartIdx = 0;
  let windowStartCol = 0;

  // If the right edge of cursor char exceeds available width from start, shift window
  if (cursorRightEdge > availableWidth) {
    // We need windowStartCol such that cursorRightEdge - windowStartCol <= availableWidth
    const minStartCol = cursorRightEdge - availableWidth;
    let accum = 0;
    for (let i = 0; i < chars.length; i++) {
      const cw = stringWidth(chars[i]!);
      if (accum + cw > minStartCol) {
        // This char straddles or is past the minimum start column
        // If we start right after this char, we might overshoot, so start here
        // unless the accumulated width already exceeds minStartCol
        if (accum >= minStartCol) {
          windowStartIdx = i;
          windowStartCol = accum;
        } else {
          // Start at next char to ensure cursor fits
          windowStartIdx = i + 1;
          windowStartCol = accum + cw;
        }
        break;
      }
      accum += cw;
    }
  }

  // Now build the visible text from windowStartIdx, fitting availableWidth
  let visibleChars: string[] = [];
  let visibleWidth = 0;
  for (let i = windowStartIdx; i < chars.length; i++) {
    const cw = stringWidth(chars[i]!);
    if (visibleWidth + cw > availableWidth) break;
    visibleChars.push(chars[i]!);
    visibleWidth += cw;
  }

  const cursorOffset = cursorCol - windowStartCol;

  return {
    visibleText: visibleChars.join(''),
    windowStart: windowStartIdx,
    cursorOffset,
  };
}

/**
 * Returns the visible portion of text that fits within availableWidth columns.
 * When cursorPosition is provided, ensures the cursor is within the visible window.
 * Without cursorPosition, shows the rightmost (most recent) content (backward compat).
 * Uses string-width for CJK-aware column calculation.
 */
export function getVisibleText(text: string, availableWidth: number, cursorPosition?: number): string {
  if (availableWidth <= 0) return '';
  const totalWidth = stringWidth(text);
  if (totalWidth <= availableWidth) return text;

  const chars = Array.from(text);
  const pos = cursorPosition ?? chars.length;
  return getVisibleWindow(text, availableWidth, pos).visibleText;
}

interface IMETextInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** If true, onSubmit fires even with empty text (for "press Enter" prompts) */
  allowEmpty?: boolean;
  /** Show visual cursor indicator. Default true */
  showCursor?: boolean;
  /** When false, disables input handling. Default true */
  isActive?: boolean;
  /** Called whenever the input text changes (for autocomplete, etc.) */
  onTextChange?: (text: string) => void;
  /**
   * Intercept key events before IMETextInput processes them.
   * Return true to consume the event (skip default handling).
   * setText allows the interceptor to replace the input text.
   */
  onKeyIntercept?: (input: string, key: Key, setText: (text: string) => void) => boolean;
}

/**
 * Text input with Korean IME support.
 *
 * Key insight: When Korean IME finalizes a character (e.g., pressing Enter
 * after composing 마), the finalized char and Enter arrive as near-simultaneous
 * events. React state batching means setText("마") hasn't committed when the
 * Enter handler reads `text`. Solution: use a ref as the source of truth for
 * the current text value, so Enter always submits the latest accumulated input.
 */
export function IMETextInput({ onSubmit, placeholder, allowEmpty = false, showCursor = true, isActive = true, onTextChange, onKeyIntercept }: IMETextInputProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? DEFAULT_TERMINAL_WIDTH;
  const availableWidth = columns - stringWidth(PROMPT) - 1; // 1 for cursor

  const [text, setText] = useState('');
  const textRef = useRef('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const cursorPosRef = useRef(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  // Keep refs in sync for closure access
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  /** Update text + cursor, notify onTextChange */
  const updateText = (newText: string, newCursorPos: number) => {
    textRef.current = newText;
    setText(newText);
    cursorPosRef.current = newCursorPos;
    setCursorPosition(newCursorPos);
    onTextChange?.(newText);
  };

  /** Set text externally (used by onKeyIntercept for autocomplete) */
  const setInputText = (newText: string) => {
    const newCursorPos = Array.from(newText).length;
    updateText(newText, newCursorPos);
  };

  useInput((input, key) => {
    if (onKeyIntercept?.(input, key, setInputText)) return;

    if (key.return) {
      // CRITICAL: Read from ref, not state — avoids React batching race
      const currentText = textRef.current;
      if (currentText.trim() || allowEmpty) {
        onSubmit(currentText);
        if (currentText.trim()) {
          setHistory(prev => [...prev, currentText]);
        }
      }
      updateText('', 0);
      setHistoryIndex(-1);
      return;
    }

    if (key.leftArrow) {
      const newPos = Math.max(0, cursorPosRef.current - 1);
      cursorPosRef.current = newPos;
      setCursorPosition(newPos);
      return;
    }

    if (key.rightArrow) {
      const chars = Array.from(textRef.current);
      const newPos = Math.min(chars.length, cursorPosRef.current + 1);
      cursorPosRef.current = newPos;
      setCursorPosition(newPos);
      return;
    }

    if (key.backspace || key.delete) {
      const pos = cursorPosRef.current;
      if (pos <= 0) return; // Nothing to delete before cursor
      const chars = Array.from(textRef.current);
      chars.splice(pos - 1, 1);
      const newText = chars.join('');
      updateText(newText, pos - 1);
      return;
    }

    if (key.upArrow && historyRef.current.length > 0) {
      const hist = historyRef.current;
      const idx = historyIndexRef.current;
      const newIndex = idx < 0 ? hist.length - 1 : Math.max(0, idx - 1);
      setHistoryIndex(newIndex);
      const newText = hist[newIndex] ?? '';
      const newCursorPos = Array.from(newText).length;
      updateText(newText, newCursorPos);
      return;
    }

    if (key.downArrow && historyIndexRef.current >= 0) {
      const hist = historyRef.current;
      const newIndex = historyIndexRef.current + 1;
      if (newIndex >= hist.length) {
        setHistoryIndex(-1);
        updateText('', 0);
      } else {
        setHistoryIndex(newIndex);
        const newText = hist[newIndex] ?? '';
        const newCursorPos = Array.from(newText).length;
        updateText(newText, newCursorPos);
      }
      return;
    }

    // Insert printable input at cursor position (ASCII, Korean, emoji, etc.)
    if (!key.ctrl && !key.meta && input) {
      const chars = Array.from(textRef.current);
      const pos = cursorPosRef.current;
      const inputChars = Array.from(input);
      chars.splice(pos, 0, ...inputChars);
      const newText = chars.join('');
      updateText(newText, pos + inputChars.length);
    }
  }, { isActive });

  // Render with cursor-aware visible window
  const renderContent = () => {
    if (!isActive) {
      return <Text dimColor>{placeholder ?? 'Connection lost...'}</Text>;
    }

    // Has text — render with cursor (use textRef for IME-safe check)
    const displayText = text || textRef.current;
    if (displayText) {
      const { visibleText, cursorOffset } = getVisibleWindow(displayText, availableWidth, cursorPosRef.current);

      if (!showCursor) {
        return <Text>{visibleText}</Text>;
      }

      const visibleChars = Array.from(visibleText);
      let accWidth = 0;
      let splitIdx = 0;
      for (let i = 0; i < visibleChars.length; i++) {
        if (accWidth >= cursorOffset) {
          splitIdx = i;
          break;
        }
        accWidth += stringWidth(visibleChars[i]!);
        splitIdx = i + 1;
      }

      const before = visibleChars.slice(0, splitIdx).join('');
      const cursorChar = visibleChars[splitIdx] ?? ' ';
      const after = visibleChars.slice(splitIdx + 1).join('');

      return (
        <>
          <Text>{before}</Text>
          <Text inverse>{cursorChar}</Text>
          <Text>{after}</Text>
        </>
      );
    }

    // Empty — block cursor only (no placeholder — prevents IME composing overlap)
    return <Text inverse> </Text>;
  };

  return (
    <Box>
      <Text color={theme.ui.prompt}>{PROMPT}</Text>
      {renderContent()}
    </Box>
  );
}
