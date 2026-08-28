import { describe, it, expect } from 'vitest';
import { isOnline } from '@/lib/presence/online-window';

describe('isOnline', () => {
  it('is true when updated 30 seconds ago', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isOnline(new Date('2026-09-15T11:59:30Z'), now)).toBe(true);
  });

  it('is false when updated 3 minutes ago', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isOnline(new Date('2026-09-15T11:57:00Z'), now)).toBe(false);
  });
});
