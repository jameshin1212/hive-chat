import { describe, it, expect } from 'vitest';
import { connectionColor } from './StatusBar.js';

describe('connectionColor', () => {
  it('returns green for connected (any transport)', () => {
    expect(connectionColor('connected', 'direct')).toBe('green');
    expect(connectionColor('connected', 'relay')).toBe('green');
    expect(connectionColor('connected', undefined)).toBe('green');
  });

  it('returns red for offline', () => {
    expect(connectionColor('offline')).toBe('red');
  });

  it('returns yellow for connecting', () => {
    expect(connectionColor('connecting')).toBe('yellow');
  });

  it('returns yellow for reconnecting', () => {
    expect(connectionColor('reconnecting')).toBe('yellow');
  });
});
