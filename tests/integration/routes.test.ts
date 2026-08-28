import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createRoute } from '@/app/api/routes/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `route-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Route Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('routes API', () => {
  it('creates a route with server-derived voivodeship', async () => {
    const res = await createRoute(authed('http://localhost/api/routes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Tatra Loop', startLat: 50.0647, startLon: 19.9450, endLat: 49.2992, endLon: 19.9496,
        difficulty: 'moderate', bikeType: 'adventure', sceneryTags: 'mountains,forest',
      }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.voivodeship).toBe('malopolskie');
    expect(body.district).toBeNull();
  });

  it('rejects coordinates outside Poland', async () => {
    const res = await createRoute(authed('http://localhost/api/routes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Paris Loop', startLat: 48.8566, startLon: 2.3522, endLat: 48.86, endLon: 2.36,
        difficulty: 'easy', bikeType: 'naked', sceneryTags: 'urban',
      }),
    }));
    expect(res.status).toBe(400);
  });

  it('derives a Warsaw district for a route inside Warsaw', async () => {
    const res = await createRoute(authed('http://localhost/api/routes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Warsaw Cruise', startLat: 52.2297, startLon: 21.0122, endLat: 52.24, endLon: 21.02,
        difficulty: 'easy', bikeType: 'cruiser', sceneryTags: 'urban',
      }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.voivodeship).toBe('mazowieckie');
    expect(body.district).toBe('srodmiescie');
  });
});
