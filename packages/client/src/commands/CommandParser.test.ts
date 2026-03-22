import { describe, it, expect } from 'vitest';
import { parseInput, isKnownCommand, COMMANDS } from './CommandParser.js';

describe('parseInput', () => {
  it('parses /exit as a command', () => {
    expect(parseInput('/exit')).toEqual({
      type: 'command',
      name: '/exit',
      args: [],
    });
  });

  it('parses /addfriend with args', () => {
    expect(parseInput('/addfriend user#1234')).toEqual({
      type: 'command',
      name: '/addfriend',
      args: ['user#1234'],
    });
  });

  it('parses regular text as a message', () => {
    expect(parseInput('hello world')).toEqual({
      type: 'message',
      content: 'hello world',
    });
  });

  it('parses unknown /command as command for error handling', () => {
    const result = parseInput('/unknown');
    expect(result.type).toBe('command');
    if (result.type === 'command') {
      expect(result.name).toBe('/unknown');
    }
  });

  it('parses empty string as message', () => {
    expect(parseInput('')).toEqual({
      type: 'message',
      content: '',
    });
  });

  it('trims whitespace from input', () => {
    expect(parseInput('  hello  ')).toEqual({
      type: 'message',
      content: 'hello',
    });
  });

  it('parses /help as a known command', () => {
    expect(parseInput('/help')).toEqual({
      type: 'command',
      name: '/help',
      args: [],
    });
  });
});

describe('isKnownCommand', () => {
  it('returns true for /exit', () => {
    expect(isKnownCommand('/exit')).toBe(true);
  });

  it('returns true for /help', () => {
    expect(isKnownCommand('/help')).toBe(true);
  });

  it('returns false for /unknown', () => {
    expect(isKnownCommand('/unknown')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKnownCommand('')).toBe(false);
  });
});

describe('COMMANDS', () => {
  it('contains all expected commands', () => {
    const commandNames = Object.keys(COMMANDS);
    expect(commandNames).toContain('/exit');
    expect(commandNames).toContain('/nearby');
    expect(commandNames).toContain('/friends');
    expect(commandNames).not.toContain('/chat');
    expect(commandNames).toContain('/settings');
    expect(commandNames).toContain('/help');
  });
});
