import { describe, expect, it } from 'vitest';
import { riderCard, riderRank } from '@/lib/demo/rider-card';

describe('riderCard', () => {
  it('flags the reserved flyerone@demo.ironcult.local account as the current demo user regardless of display name', () => {
    const card = riderCard({
      riderId: 'x',
      displayName: 'nerosoobat',
      email: 'flyerone@demo.ironcult.local',
      crewId: 'crew-1',
      crewName: 'Iron Cult',
      motorcycle: 'Versys Kawasaki',
      experience: '6 years',
      style: 'adventure',
    });
    expect(card.isCurrentDemoUser).toBe(true);
    expect(card.markerColor).toBe('hsl(5, 92%, 54%)');
  });

  it('does not flag a regular rider even if they name themselves FlyerOne', () => {
    const card = riderCard({
      riderId: 'y',
      displayName: 'FlyerOne',
      email: 'someone-else@example.com',
      crewId: null,
      crewName: null,
      motorcycle: null,
      experience: null,
      style: null,
    });
    expect(card.isCurrentDemoUser).toBe(false);
  });
});

describe('riderRank', () => {
  it('does not force a special rank just because experience is a duration string', () => {
    expect(riderRank('6 years')).toBe('Rider');
  });
});
