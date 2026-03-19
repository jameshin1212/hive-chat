import React, { useState } from 'react';
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

interface IMETextInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** If true, onSubmit fires even with empty text (for "press Enter" prompts) */
  allowEmpty?: boolean;
  /** Show visual cursor indicator. Default true */
  showCursor?: boolean;
}

export function IMETextInput({ onSubmit, placeholder, allowEmpty = false, showCursor = true }: IMETextInputProps) {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useInput((input, key) => {
    if (key.return) {
      if (text.trim() || allowEmpty) {
        onSubmit(text);
        if (text.trim()) {
          setHistory(prev => [...prev, text]);
        }
      }
      setText('');
      setHistoryIndex(-1);
      return;
    }
    if (key.backspace || key.delete) {
      setText(prev => {
        // Remove last character (works for CJK — Array.from handles surrogates)
        const chars = Array.from(prev);
        chars.pop();
        return chars.join('');
      });
      return;
    }
    if (key.upArrow && history.length > 0) {
      const newIndex = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setText(history[newIndex] ?? '');
      return;
    }
    if (key.downArrow && historyIndex >= 0) {
      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setText('');
      } else {
        setHistoryIndex(newIndex);
        setText(history[newIndex] ?? '');
      }
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      setText(prev => prev + input);
    }
  });

  const showPlaceholder = !text && placeholder;

  return (
    <Box>
      <Text color={theme.ui.prompt}>{PROMPT}</Text>
      {showPlaceholder ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <Text>{text}</Text>
      )}
      {showCursor ? <Text color={theme.text.primary}>▏</Text> : null}
    </Box>
  );
}
