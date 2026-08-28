import { describe, it, expect } from 'vitest';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('auth API', () => {
  const email = `rider-${Date.now()}@example.com`;

  it('registers a new rider and returns a token', async () => {
    const res = await register(jsonRequest({ email, password: 'hunter22', displayName: 'Test Rider' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.riderId).toBeDefined();
  });

  it('logs in with correct credentials', async () => {
    const res = await login(jsonRequest({ email, password: 'hunter22' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const res = await login(jsonRequest({ email, password: 'wrong-password' }));
    expect(res.status).toBe(401);
  });
});
