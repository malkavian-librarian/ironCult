import { describe, it, expect, beforeAll } from 'vitest';
import { GET as listCrews, POST as createCrew } from '@/app/api/crews/route';
import { POST as joinCrew } from '@/app/api/crews/join/route';
import { POST as register } from '@/app/api/auth/register/route';
import { GET as getProfile } from '@/app/api/profile/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `crew-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Crew Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('crews API', () => {
  it('creates a crew and lists it', async () => {
    const name = `Iron Wolves ${Date.now()}`;
    const createRes = await createCrew(authed('http://localhost/api/crews', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
    }));
    expect(createRes.status).toBe(201);
    const listRes = await listCrews(authed('http://localhost/api/crews'));
    const crews = await listRes.json();
    expect(crews.some((c: { name: string }) => c.name === name)).toBe(true);
  });

  it('rejects duplicate crew names', async () => {
    const name = `Duplicate Crew ${Date.now()}`;
    await createCrew(authed('http://localhost/api/crews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }));
    const res = await createCrew(authed('http://localhost/api/crews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }));
    expect(res.status).toBe(409);
  });

  it('lets a rider join a crew', async () => {
    const name = `Joinable Crew ${Date.now()}`;
    const createRes = await createCrew(authed('http://localhost/api/crews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }));
    const crew = await createRes.json();
    const joinRes = await joinCrew(authed('http://localhost/api/crews/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ crewId: crew.id }) }));
    expect(joinRes.status).toBe(200);
    const profileRes = await getProfile(authed('http://localhost/api/profile'));
    const profile = await profileRes.json();
    expect(profile.crewId).toBe(crew.id);
  });
});
