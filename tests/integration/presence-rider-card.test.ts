import { beforeAll, describe, expect, it } from 'vitest';
import { POST as register } from '@/app/api/auth/register/route';
import { PATCH as updateProfile } from '@/app/api/profile/route';
import { POST as createCrew } from '@/app/api/crews/route';
import { POST as joinCrew } from '@/app/api/crews/join/route';
import { POST as pingPresence, GET as listPresence } from '@/app/api/presence/route';

const displayName = 'FlyerOne';
const motorcycle = 'Triumph Bonneville T120';
const crewName = `Iron Cult ${Date.now()}`;
let token: string;
let riderId: string;

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
}

beforeAll(async () => {
  const registerRes = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `presence-rider-card-${Date.now()}@example.com`,
      password: 'hunter22',
      displayName,
    }),
  }));
  const registered = await registerRes.json();
  token = registered.token;
  riderId = registered.riderId;
});

describe('presence rider card contract', () => {
  it('returns demo rider card fields for FlyerOne', async () => {
    await updateProfile(authed('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ motorcycle, experience: 'Founder' }),
    }));
    const crewRes = await createCrew(authed('http://localhost/api/crews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: crewName }),
    }));
    const crew = await crewRes.json();
    await joinCrew(authed('http://localhost/api/crews/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ crewId: crew.id }),
    }));
    await pingPresence(authed('http://localhost/api/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 52.24, lon: 21.03 }),
    }));

    const listRes = await listPresence();
    const body = await listRes.json();
    const rider = body.find((row: { riderId: string }) => row.riderId === riderId);

    expect(rider).toMatchObject({
      riderId,
      displayName,
      motorcycle,
      rank: 'Founder',
      clubName: crewName,
      markerColor: 'hsl(5, 92%, 54%)',
      isCurrentDemoUser: true,
    });
    expect(rider.avatarUrl).toMatch(/^data:image\/svg\+xml,/);
  });
});
