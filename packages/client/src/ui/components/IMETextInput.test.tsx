import { describe, it, expect } from 'vitest';
import { calcCursorX } from './IMETextInput.js';

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
});
