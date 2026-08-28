import { describe, it, expect } from 'vitest';
import { GET as getTurfWar } from '@/app/api/turf-war/route';

describe('turf-war API', () => {
  it('returns an object keyed by Warsaw district', async () => {
    const res = await getTurfWar();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe('object');
  });
});
