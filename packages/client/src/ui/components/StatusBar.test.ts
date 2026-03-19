import { describe, it, expect } from 'vitest';
import { connectionColor } from './StatusBar.js';

describe('connectionColor', () => {
  it('returns green for connected + direct transport', () => {
    expect(connectionColor('connected', 'direct')).toBe('green');
  });

  it('returns yellow for connected + relay transport', () => {
    expect(connectionColor('connected', 'relay')).toBe('yellow');
  });

  it('returns yellow for connected + undefined transport (backward compat)', () => {
    expect(connectionColor('connected', undefined)).toBe('yellow');
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
