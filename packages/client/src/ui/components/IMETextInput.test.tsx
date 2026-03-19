import { describe, it, expect } from 'vitest';
import { calcCursorX, getVisibleText, getVisibleWindow } from './IMETextInput.js';

describe('IMETextInput', () => {
  describe('calcCursorX', () => {
    it('returns prompt width for empty string', () => {
      expect(calcCursorX('', '> ')).toBe(2);
    });

    it('calculates ASCII string width correctly', () => {
      expect(calcCursorX('hello', '> ')).toBe(7); // 2 prompt + 5 ASCII
    });

    it('calculates CJK string width correctly (Korean)', () => {
      // Korean characters are 2-column wide each
      expect(calcCursorX('한글', '> ')).toBe(6); // 2 prompt + 2*2 CJK
    });

    it('calculates mixed ASCII + CJK string width correctly', () => {
      expect(calcCursorX('abc한d', '> ')).toBe(8); // 2 prompt + 3 ASCII + 2 CJK + 1 ASCII
    });

    it('uses custom prompt string', () => {
      expect(calcCursorX('hi', '>>> ')).toBe(6); // 4 prompt + 2 ASCII
    });

    it('handles emoji width correctly', () => {
      // Emoji should be 2-column wide
      const width = calcCursorX('👍', '> ');
      expect(width).toBe(4); // 2 prompt + 2 emoji
    });

    it('handles multiple Korean characters', () => {
      expect(calcCursorX('안녕하세요', '> ')).toBe(12); // 2 prompt + 5*2 CJK
    });
  });

  describe('getVisibleText', () => {
    it('returns last N columns when text exceeds available width', () => {
      expect(getVisibleText('hello world', 5)).toBe('world');
    });

    it('returns full text when shorter than available width', () => {
      expect(getVisibleText('short', 20)).toBe('short');
    });

    it('handles CJK characters with 2-column width', () => {
      // "abc한글def" — we want last 6 columns from end
      // d=1, e=1, f=1, 글=2, => 5, 한=2 => 7 > 6, so result is "글def"
      expect(getVisibleText('abc한글def', 6)).toBe('글def');
    });

    it('returns empty string for empty input', () => {
      expect(getVisibleText('', 20)).toBe('');
    });

    it('handles CJK-only text with boundary fitting', () => {
      // "한글한글한글" = 12 columns total, available=5
      // From end: 글=2(2), 한=2(4), 글=2(6)>5, so result is "한글" (4 columns)
      expect(getVisibleText('한글한글한글', 5)).toBe('한글');
    });

    it('handles mixed text at CJK boundary', () => {
      // "a한b" = 1+2+1 = 4 columns, available=3
      // From end: b=1(1), 한=2(3), fits! result is "한b"
      expect(getVisibleText('a한b', 3)).toBe('한b');
    });

    it('returns full text when width exactly matches', () => {
      expect(getVisibleText('hello', 5)).toBe('hello');
    });

    it('handles zero available width', () => {
      expect(getVisibleText('hello', 0)).toBe('');
    });

    it('returns full text with cursorPosition at end (backward compat)', () => {
      // Calling with cursorPosition should behave same as without when cursor at end
      expect(getVisibleText('hello world', 5, 11)).toBe('world');
    });

    it('returns beginning when cursorPosition is at start', () => {
      expect(getVisibleText('hello world', 5, 0)).toBe('hello');
    });
  });

  describe('getVisibleWindow', () => {
    it('returns full text when shorter than available width', () => {
      const result = getVisibleWindow('hello', 20, 3);
      expect(result.visibleText).toBe('hello');
      expect(result.windowStart).toBe(0);
      expect(result.cursorOffset).toBe(3); // 3 ASCII chars before cursor
    });

    it('shows start of long ASCII text when cursor at position 0', () => {
      const text = 'abcdefghijklmnopqrst'; // 20 chars
      const result = getVisibleWindow(text, 10, 0);
      expect(result.visibleText).toBe('abcdefghij');
      expect(result.windowStart).toBe(0);
      expect(result.cursorOffset).toBe(0);
    });

    it('shows middle of long ASCII text when cursor at middle', () => {
      const text = 'abcdefghijklmnopqrst'; // 20 chars
      const result = getVisibleWindow(text, 10, 10);
      // cursor=10 ('k'), window should include cursor position
      expect(result.visibleText.length).toBe(10);
      // cursor should be within visible range
      expect(result.cursorOffset).toBeGreaterThanOrEqual(0);
      expect(result.cursorOffset).toBeLessThanOrEqual(10);
      // The char at cursor position should be in visible text
      expect(result.visibleText).toContain('k');
    });

    it('shows end of long ASCII text when cursor at end', () => {
      const text = 'abcdefghijklmnopqrst'; // 20 chars
      const result = getVisibleWindow(text, 10, 20);
      expect(result.visibleText).toBe('klmnopqrst');
      expect(result.windowStart).toBe(10);
      expect(result.cursorOffset).toBe(10); // cursor at end of visible text
    });

    it('handles CJK characters at window boundary', () => {
      // "abcde한글fgh" — 5 + 4 + 3 = 12 columns
      // cursor at position 5 (한), available=6
      const text = 'abcde한글fgh';
      const result = getVisibleWindow(text, 6, 5);
      // cursor is at '한' (position 5), should be visible
      expect(result.visibleText).toContain('한');
      expect(result.cursorOffset).toBeGreaterThanOrEqual(0);
      expect(result.cursorOffset).toBeLessThanOrEqual(6);
    });

    it('handles CJK-only text with cursor at start', () => {
      // "한글한글한글" = 6 chars, 12 columns
      const text = '한글한글한글';
      const result = getVisibleWindow(text, 6, 0);
      // Should show first 3 CJK chars (6 columns)
      expect(result.visibleText).toBe('한글한');
      expect(result.windowStart).toBe(0);
      expect(result.cursorOffset).toBe(0);
    });

    it('returns correct cursorOffset for CJK text', () => {
      // "ab한cd" cursor at position 3 (after 한, before c)
      const result = getVisibleWindow('ab한cd', 20, 3);
      expect(result.visibleText).toBe('ab한cd');
      expect(result.cursorOffset).toBe(4); // a(1) + b(1) + 한(2) = 4 columns
    });

    it('handles empty text', () => {
      const result = getVisibleWindow('', 20, 0);
      expect(result.visibleText).toBe('');
      expect(result.windowStart).toBe(0);
      expect(result.cursorOffset).toBe(0);
    });
  });
});
