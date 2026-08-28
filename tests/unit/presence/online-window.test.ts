import { describe, it, expect } from 'vitest';
import { isOnline } from '@/lib/presence/online-window';

describe('isOnline', () => {
  it('is true when updated 10 seconds ago', () => {
    const now = new Date('2026-09-15T12:00:10Z');
    expect(isOnline(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is true when updated 30 seconds ago', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isOnline(new Date('2026-09-15T11:59:30Z'), now)).toBe(true);
  });

  it('is true when updated 90 seconds ago (within the demo-length window)', () => {
    const now = new Date('2026-09-15T12:01:30Z');
    expect(isOnline(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is false when updated 5 hours ago (past the 4-hour window)', () => {
    const now = new Date('2026-09-15T17:00:00Z');
    expect(isOnline(new Date('2026-09-15T12:00:00Z'), now)).toBe(false);
  });
});
