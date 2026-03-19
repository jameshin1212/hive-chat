import { describe, it, expect } from 'vitest';
import { calcCursorX, getVisibleText } from './IMETextInput.js';

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
  });
});
