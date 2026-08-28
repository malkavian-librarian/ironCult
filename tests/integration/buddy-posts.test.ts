import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createPost, GET as listPosts } from '@/app/api/buddy-posts/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `buddy-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Buddy Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('buddy-posts API', () => {
  it('creates a post', async () => {
    const res = await createPost(authed('http://localhost/api/buddy-posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voivodeship: 'malopolskie', plannedDate: '2026-09-15', note: 'Looking for two riders, relaxed pace' }),
    }));
    expect(res.status).toBe(201);
  });

  it('lists posts filtered by voivodeship', async () => {
    await createPost(authed('http://localhost/api/buddy-posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voivodeship: 'mazowieckie', plannedDate: '2026-09-20' }),
    }));
    const res = await listPosts(new Request('http://localhost/api/buddy-posts?voivodeship=mazowieckie'));
    const body = await res.json();
    expect(body.every((p: { voivodeship: string }) => p.voivodeship === 'mazowieckie')).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated post creation', async () => {
    const res = await createPost(new Request('http://localhost/api/buddy-posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voivodeship: 'slaskie', plannedDate: '2026-09-01' }),
    }));
    expect(res.status).toBe(401);
  });
});
