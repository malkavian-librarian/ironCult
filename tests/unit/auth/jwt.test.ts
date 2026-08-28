import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '@/lib/auth/jwt';

describe('jwt', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken({ riderId: 'abc-123' });
    const payload = verifyToken(token);
    expect(payload.riderId).toBe('abc-123');
  });

  it('throws on a tampered token', () => {
    const token = signToken({ riderId: 'abc-123' });
    expect(() => verifyToken(token + 'x')).toThrow();
  });
});
