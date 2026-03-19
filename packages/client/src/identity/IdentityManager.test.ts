import { describe, it, expect, afterEach } from 'vitest';
import { generateTag, saveIdentity, loadIdentity, clearIdentity, formatIdentityDisplay } from './IdentityManager.js';
import { identitySchema, AI_CLI_OPTIONS } from '@cling-talk/shared';

afterEach(() => {
  clearIdentity();
});

describe('generateTag', () => {
  it('returns a 4-char uppercase hex string', () => {
    const tag = generateTag();
    expect(tag).toMatch(/^[0-9A-F]{4}$/);
  });

  it('generates different tags on successive calls', () => {
    const tags = new Set(Array.from({ length: 20 }, () => generateTag()));
    // With 16^4 = 65536 possibilities, 20 calls should produce at least 2 unique
    expect(tags.size).toBeGreaterThan(1);
  });
});

describe('saveIdentity', () => {
  it('stores and returns a valid Identity with schemaVersion 1', () => {
    const identity = saveIdentity('coder', 'Claude Code');
    expect(identity.nickname).toBe('coder');
    expect(identity.aiCli).toBe('Claude Code');
    expect(identity.schemaVersion).toBe(1);
    expect(identity.tag).toMatch(/^[0-9A-F]{4}$/);
    // Should pass schema validation
    expect(() => identitySchema.parse(identity)).not.toThrow();
  });
});

describe('loadIdentity', () => {
  it('returns undefined when no identity is stored', () => {
    expect(loadIdentity()).toBeUndefined();
  });

  it('round-trips with saveIdentity', () => {
    const saved = saveIdentity('my-nick', 'Codex');
    const loaded = loadIdentity();
    expect(loaded).toEqual(saved);
  });
});

describe('nickname validation via identitySchema', () => {
  const validNicknames = ['coder', 'my-nick', 'a1_b2'];
  const invalidNicknames = [
    { value: '', reason: 'empty string' },
    { value: 'ab cd', reason: 'contains space' },
    { value: 'a'.repeat(17), reason: 'too long (17 chars)' },
    { value: 'UPPER', reason: 'uppercase letters' },
  ];

  it.each(validNicknames)('accepts valid nickname: %s', (nick) => {
    expect(() =>
      identitySchema.parse({
        nickname: nick,
        tag: '3A7F',
        aiCli: 'Claude Code',
        schemaVersion: 1,
      })
    ).not.toThrow();
  });

  it.each(invalidNicknames)('rejects invalid nickname: $value ($reason)', ({ value }) => {
    expect(() =>
      identitySchema.parse({
        nickname: value,
        tag: '3A7F',
        aiCli: 'Claude Code',
        schemaVersion: 1,
      })
    ).toThrow();
  });
});

describe('AI_CLI_OPTIONS', () => {
  it('contains exactly the expected options', () => {
    expect(AI_CLI_OPTIONS).toEqual(['Claude Code', 'Codex', 'Gemini', 'Cursor']);
  });
});

describe('formatIdentityDisplay', () => {
  it('returns nick#TAG format', () => {
    const result = formatIdentityDisplay({
      nickname: 'coder',
      tag: '3A7F',
      aiCli: 'Claude Code',
      schemaVersion: 1,
    });
    expect(result).toBe('coder#3A7F');
  });
});
