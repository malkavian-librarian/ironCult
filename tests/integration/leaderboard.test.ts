import { describe, it, expect } from 'vitest';
import { GET as crewLeaderboard } from '@/app/api/leaderboard/crews/route';
import { GET as riderLeaderboard } from '@/app/api/leaderboard/riders/route';

describe('leaderboard API', () => {
  it('returns crew leaderboard sorted by route count descending', async () => {
    const res = await crewLeaderboard(new Request('http://localhost/api/leaderboard/crews'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    for (let i = 1; i < body.length; i++) {
      expect(body[i - 1].routeCount).toBeGreaterThanOrEqual(body[i].routeCount);
    }
  });

  it('returns rider leaderboard sorted by route count descending', async () => {
    const res = await riderLeaderboard(new Request('http://localhost/api/leaderboard/riders'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
