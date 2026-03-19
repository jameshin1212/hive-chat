import React, { useState, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import stringWidth from 'string-width';
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
 * Returns the visible portion of text that fits within availableWidth columns,
 * showing the rightmost (most recent) content. Uses string-width for CJK-aware
 * column calculation. If a CJK character straddles the boundary, it is excluded.
 */
export function getVisibleText(text: string, availableWidth: number): string {
  if (availableWidth <= 0) return '';
  const totalWidth = stringWidth(text);
  if (totalWidth <= availableWidth) return text;

  // Walk backwards from end, accumulating width
  const chars = Array.from(text);
  let accumulatedWidth = 0;
  let startIndex = chars.length;

  for (let i = chars.length - 1; i >= 0; i--) {
    const charWidth = stringWidth(chars[i]!);
    if (accumulatedWidth + charWidth > availableWidth) break;
    accumulatedWidth += charWidth;
    startIndex = i;
  }

  return chars.slice(startIndex).join('');
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
export function IMETextInput({ onSubmit, placeholder, allowEmpty = false, showCursor = true, isActive = true }: IMETextInputProps) {
  const [text, setText] = useState('');
  const textRef = useRef('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  // Keep refs in sync for closure access
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  useInput((input, key) => {
    if (key.return) {
      // CRITICAL: Read from ref, not state — avoids React batching race
      const currentText = textRef.current;
      if (currentText.trim() || allowEmpty) {
        onSubmit(currentText);
        if (currentText.trim()) {
          setHistory(prev => [...prev, currentText]);
        }
      }
      textRef.current = '';
      setText('');
      setHistoryIndex(-1);
      return;
    }

    if (key.backspace || key.delete) {
      const chars = Array.from(textRef.current);
      chars.pop();
      const newText = chars.join('');
      textRef.current = newText;
      setText(newText);
      return;
    }

    if (key.upArrow && historyRef.current.length > 0) {
      const hist = historyRef.current;
      const idx = historyIndexRef.current;
      const newIndex = idx < 0 ? hist.length - 1 : Math.max(0, idx - 1);
      setHistoryIndex(newIndex);
      const newText = hist[newIndex] ?? '';
      textRef.current = newText;
      setText(newText);
      return;
    }

    if (key.downArrow && historyIndexRef.current >= 0) {
      const hist = historyRef.current;
      const newIndex = historyIndexRef.current + 1;
      if (newIndex >= hist.length) {
        setHistoryIndex(-1);
        textRef.current = '';
        setText('');
      } else {
        setHistoryIndex(newIndex);
        const newText = hist[newIndex] ?? '';
        textRef.current = newText;
        setText(newText);
      }
      return;
    }

    // Append any printable input (ASCII, Korean, emoji, etc.)
    if (!key.ctrl && !key.meta && input) {
      textRef.current += input;
      setText(textRef.current);
    }
  }, { isActive });

  const showPlaceholder = (!text && placeholder) || !isActive;

  return (
    <Box>
      <Text color={theme.ui.prompt}>{PROMPT}</Text>
      {showPlaceholder ? (
        <Text dimColor>{!isActive ? (placeholder ?? 'Connection lost...') : placeholder}</Text>
      ) : (
        <Text>{text}</Text>
      )}
      {showCursor && isActive && !showPlaceholder ? <Text color={theme.text.primary}>▏</Text> : null}
    </Box>
  );
}
