import { describe, it, expect } from 'vitest';
import { isHappeningNow } from '@/lib/events/happening-now';

describe('isHappeningNow', () => {
  it('is true exactly at start time', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is true 1 hour before start', () => {
    const now = new Date('2026-09-15T11:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is true 3 hours after start', () => {
    const now = new Date('2026-09-15T15:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is false 2 hours before start', () => {
    const now = new Date('2026-09-15T10:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(false);
  });

  it('is false 5 hours after start', () => {
    const now = new Date('2026-09-15T17:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(false);
  });
});
