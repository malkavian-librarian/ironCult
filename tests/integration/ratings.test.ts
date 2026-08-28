import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createRoute } from '@/app/api/routes/route';
import { POST as rate } from '@/app/api/routes/[id]/ratings/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;
let routeId: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `rate-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Rate Tester' }),
  }));
  token = (await res.json()).token;
  const routeRes = await createRoute(new Request('http://localhost/api/routes', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Ratable Route', startLat: 52.2297, startLon: 21.0122, endLat: 52.3, endLon: 21.1, difficulty: 'easy', bikeType: 'touring', sceneryTags: 'plains' }),
  }));
  routeId = (await routeRes.json()).id;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('ratings API', () => {
  it('submits a rating and returns the new average', async () => {
    const res = await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 4 }),
    }), { params: Promise.resolve({ id: routeId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.average).toBe(4);
  });

  it('updates the same rider\'s rating instead of duplicating', async () => {
    await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 4 }),
    }), { params: Promise.resolve({ id: routeId }) });
    const res = await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 2 }),
    }), { params: Promise.resolve({ id: routeId }) });
    const body = await res.json();
    expect(body.average).toBe(2);
  });

  it('rejects a score outside 1-5', async () => {
    const res = await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 9 }),
    }), { params: Promise.resolve({ id: routeId }) });
    expect(res.status).toBe(400);
  });
});
