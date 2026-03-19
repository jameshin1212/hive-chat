import { describe, it, expect } from 'vitest';
import { calcVisibleMessages } from './MessageArea.js';
import type { ChatMessage } from '@cling-talk/shared';

function makeMsgs(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    from: { nickname: 'user', tag: '0001', aiCli: 'Claude Code' as const, schemaVersion: 1 as const },
    content: `message ${i}`,
    timestamp: Date.now() + i,
  }));
}

describe('calcVisibleMessages', () => {
  it('returns last N messages when scrollOffset=0 (auto-scroll to bottom)', () => {
    const msgs = makeMsgs(10);
    const result = calcVisibleMessages(msgs, 5, 0);
    expect(result).toHaveLength(5);
    expect(result[0]!.id).toBe('msg-5');
    expect(result[4]!.id).toBe('msg-9');
  });

  it('returns scrolled-up messages when scrollOffset > 0', () => {
    const msgs = makeMsgs(10);
    const result = calcVisibleMessages(msgs, 5, 3);
    expect(result).toHaveLength(5);
    expect(result[0]!.id).toBe('msg-2');
    expect(result[4]!.id).toBe('msg-6');
  });

  it('returns all messages when fewer than availableHeight', () => {
    const msgs = makeMsgs(3);
    const result = calcVisibleMessages(msgs, 10, 0);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe('msg-0');
    expect(result[2]!.id).toBe('msg-2');
  });

  it('returns empty array when no messages', () => {
    const result = calcVisibleMessages([], 5, 0);
    expect(result).toEqual([]);
  });

  it('returns empty array when availableHeight <= 0', () => {
    const msgs = makeMsgs(5);
    expect(calcVisibleMessages(msgs, 0, 0)).toEqual([]);
    expect(calcVisibleMessages(msgs, -1, 0)).toEqual([]);
  });

  it('clamps scrollOffset to max (messages.length - availableHeight)', () => {
    const msgs = makeMsgs(10);
    // scrollOffset=20 should clamp to max=5
    const result = calcVisibleMessages(msgs, 5, 20);
    expect(result).toHaveLength(5);
    expect(result[0]!.id).toBe('msg-0');
    expect(result[4]!.id).toBe('msg-4');
  });

  it('clamps scrollOffset to 0 when negative', () => {
    const msgs = makeMsgs(10);
    const result = calcVisibleMessages(msgs, 5, -3);
    expect(result).toHaveLength(5);
    // Same as scrollOffset=0
    expect(result[0]!.id).toBe('msg-5');
    expect(result[4]!.id).toBe('msg-9');
  });
});
