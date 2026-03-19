import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdin } from 'ink';
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

/**
 * IME-aware text input that handles Korean/CJK composition correctly.
 *
 * Problem: macOS Korean IME in terminal raw mode sends composition as:
 *   1. Backspace (erase previous composing char)
 *   2. New composing character (replacement)
 *
 * Ink's useInput doesn't handle this sequence correctly — it treats
 * the IME backspace+replace as separate events, losing the composing state.
 *
 * Solution: Read raw stdin data directly, detect IME composition patterns,
 * and maintain a composing buffer that gets finalized on non-composing input.
 */
export function IMETextInput({ onSubmit, placeholder, allowEmpty = false, showCursor = true }: IMETextInputProps) {
  const [committed, setCommitted] = useState('');
  const [composing, setComposing] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { stdin, setRawMode } = useStdin();
  const committedRef = useRef(committed);
  const composingRef = useRef(composing);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  committedRef.current = committed;
  composingRef.current = composing;
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  useEffect(() => {
    if (!stdin) return;

    setRawMode(true);

    const handleData = (data: Buffer) => {
      const str = data.toString('utf8');
      const bytes = data;

      // Enter key (CR or LF)
      if (str === '\r' || str === '\n') {
        const fullText = committedRef.current + composingRef.current;
        if (fullText.trim() || allowEmpty) {
          onSubmit(fullText);
          if (fullText.trim()) {
            setHistory(prev => [...prev, fullText]);
          }
        }
        setCommitted('');
        setComposing('');
        setHistoryIndex(-1);
        return;
      }

      // Backspace (0x7f or 0x08)
      if (bytes[0] === 0x7f || bytes[0] === 0x08) {
        if (composingRef.current) {
          // If composing, clear composing buffer (IME backspace)
          setComposing('');
        } else {
          // Remove last committed character
          setCommitted(prev => {
            const chars = Array.from(prev);
            chars.pop();
            return chars.join('');
          });
        }
        return;
      }

      // Escape sequences (arrows, etc.)
      if (bytes[0] === 0x1b) {
        // Up arrow: \x1b[A
        if (str === '\x1b[A' && historyRef.current.length > 0) {
          // Commit any composing text first
          if (composingRef.current) {
            setCommitted(prev => prev + composingRef.current);
            setComposing('');
          }
          const hist = historyRef.current;
          const idx = historyIndexRef.current;
          const newIndex = idx < 0 ? hist.length - 1 : Math.max(0, idx - 1);
          setHistoryIndex(newIndex);
          setCommitted(hist[newIndex] ?? '');
          return;
        }
        // Down arrow: \x1b[B
        if (str === '\x1b[B' && historyIndexRef.current >= 0) {
          if (composingRef.current) {
            setCommitted(prev => prev + composingRef.current);
            setComposing('');
          }
          const hist = historyRef.current;
          const newIndex = historyIndexRef.current + 1;
          if (newIndex >= hist.length) {
            setHistoryIndex(-1);
            setCommitted('');
          } else {
            setHistoryIndex(newIndex);
            setCommitted(hist[newIndex] ?? '');
          }
          return;
        }
        // Other escape sequences — ignore
        return;
      }

      // Ctrl+C (0x03)
      if (bytes[0] === 0x03) {
        process.emit('SIGINT' as any);
        return;
      }

      // Ctrl+D (0x04) — treat as exit
      if (bytes[0] === 0x04) {
        process.emit('SIGINT' as any);
        return;
      }

      // Control characters — ignore
      if (bytes.length === 1 && bytes[0]! < 0x20) {
        return;
      }

      // Regular text input
      // Check if it's a Korean/CJK character (multi-byte UTF-8)
      const isMultiByte = bytes.length > 1 && bytes[0]! >= 0x80;

      if (isMultiByte) {
        // Korean IME sends: backspace to erase old composing, then new composing char.
        // Since we handle backspace above (clearing composing buffer),
        // any new multi-byte char after that becomes the new composing char.
        //
        // However, if there's already a composing char and we get a new one
        // WITHOUT a preceding backspace, the previous composing is finalized.
        if (composingRef.current) {
          // Previous composing character is now committed
          setCommitted(prev => prev + composingRef.current);
        }
        setComposing(str);
      } else {
        // ASCII input — finalize any composing text
        if (composingRef.current) {
          setCommitted(prev => prev + composingRef.current);
          setComposing('');
        }
        setCommitted(prev => prev + str);
      }
    };

    stdin.on('data', handleData);

    return () => {
      stdin.off('data', handleData);
    };
  }, [stdin, setRawMode, onSubmit, allowEmpty]);

  const displayText = committed + composing;
  const showPlaceholder = !displayText && placeholder;

  return (
    <Box>
      <Text color={theme.ui.prompt}>{PROMPT}</Text>
      {showPlaceholder ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <>
          <Text>{committed}</Text>
          {composing ? <Text underline>{composing}</Text> : null}
        </>
      )}
      {showCursor && !showPlaceholder ? <Text color={theme.text.primary}>▏</Text> : null}
    </Box>
  );
}
