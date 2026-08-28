import { describe, it, expect, beforeAll } from 'vitest';
import { GET, PATCH } from '@/app/api/profile/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `profile-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Profile Tester' }),
  }));
  const body = await res.json();
  token = body.token;
});

function authedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
}

describe('profile API', () => {
  it('returns the authenticated rider profile', async () => {
    const res = await GET(authedRequest('http://localhost/api/profile'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe('Profile Tester');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(401);
  });

  it('updates profile fields', async () => {
    const res = await PATCH(authedRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bio: 'Loves twisty roads', style: 'adventure', pace: 'relaxed' }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bio).toBe('Loves twisty roads');
    expect(body.pace).toBe('relaxed');
  });
});
