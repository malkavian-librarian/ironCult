import { describe, it, expect, beforeAll } from 'vitest';
import { POST as pingPresence, GET as listPresence } from '@/app/api/presence/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;
let riderName: string;

beforeAll(async () => {
  riderName = `Presence Tester ${Date.now()}`;
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `presence-${Date.now()}@example.com`, password: 'hunter22', displayName: riderName }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('presence API', () => {
  it('upserts presence and appears in the online list', async () => {
    const res = await pingPresence(authed('http://localhost/api/presence', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: 52.23, lon: 21.01 }),
    }));
    expect(res.status).toBe(200);
    const listRes = await listPresence();
    const body = await listRes.json();
    expect(body.some((p: { displayName: string }) => p.displayName === riderName)).toBe(true);
  });

  it('upserting again updates the same row, not a duplicate', async () => {
    await pingPresence(authed('http://localhost/api/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: 52.24, lon: 21.02 }) }));
    await pingPresence(authed('http://localhost/api/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: 52.25, lon: 21.03 }) }));
    const listRes = await listPresence();
    const body = await listRes.json();
    const matches = body.filter((p: { displayName: string }) => p.displayName === riderName);
    expect(matches.length).toBe(1);
    expect(matches[0].lat).toBe(52.25);
  });
});
