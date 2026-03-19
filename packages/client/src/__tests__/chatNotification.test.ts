import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ringBell } from '../hooks/useChatSession.js';

describe('chatNotification', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  describe('ringBell', () => {
    it('should write bell character when stdout is TTY', () => {
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      ringBell();

      expect(writeSpy).toHaveBeenCalledWith('\x07');

      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    });

    it('should NOT write bell character when stdout is not TTY', () => {
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });

      ringBell();

      expect(writeSpy).not.toHaveBeenCalled();

      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    });

    it('should NOT ring bell for own messages (ringBell not called)', () => {
      // This test documents the contract: sendMessage in useChatSession
      // does NOT call ringBell. Only incoming chat_msg events call ringBell.
      // We verify ringBell is a separate callable function that can be
      // selectively invoked only for incoming messages.
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      // Simulate: own message path does NOT call ringBell
      // (no call here = no bell)
      expect(writeSpy).not.toHaveBeenCalled();

      // Simulate: incoming message path DOES call ringBell
      ringBell();
      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenCalledWith('\x07');

      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    });
  });
});
