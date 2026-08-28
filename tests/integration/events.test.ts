import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createEvent, GET as listEvents } from '@/app/api/events/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `event-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Event Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('events API', () => {
  it('creates an event', async () => {
    const res = await createEvent(authed('http://localhost/api/events', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Krakow Bike Night', type: 'bikenight', voivodeship: 'malopolskie', lat: 50.06, lon: 19.94, startsAt: new Date().toISOString() }),
    }));
    expect(res.status).toBe(201);
  });

  it('marks a just-created event as happening now', async () => {
    await createEvent(authed('http://localhost/api/events', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Warsaw Rally', type: 'rally', voivodeship: 'mazowieckie', lat: 52.23, lon: 21.01, startsAt: new Date().toISOString() }),
    }));
    const res = await listEvents(new Request('http://localhost/api/events?voivodeship=mazowieckie'));
    const body = await res.json();
    expect(body.some((e: { happeningNow: boolean }) => e.happeningNow)).toBe(true);
  });
});
