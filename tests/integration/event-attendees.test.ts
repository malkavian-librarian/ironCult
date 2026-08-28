import { describe, it, expect, beforeAll } from 'vitest';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as createEvent, GET as listEvents } from '@/app/api/events/route';
import { POST as attend, DELETE as unattend } from '@/app/api/events/[id]/attend/route';

let hostToken: string;
let guestToken: string;

async function registerRider(displayName: string) {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `${displayName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@example.com`,
      password: 'hunter22',
      displayName,
    }),
  }));
  return (await res.json()).token as string;
}

function authed(token: string, url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

beforeAll(async () => {
  hostToken = await registerRider('Attendee Host');
  guestToken = await registerRider('Attendee Guest');
});

describe('event attendees API', () => {
  it('creates an event with a description, lets a rider join, and reflects the count/avatar list', async () => {
    const createRes = await createEvent(authed(hostToken, 'http://localhost/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Attendee Test Meetup',
        type: 'meetup',
        voivodeship: 'mazowieckie',
        lat: 52.23,
        lon: 21.01,
        startsAt: new Date().toISOString(),
        description: 'A relaxed night ride around Warsaw.',
      }),
    }));
    expect(createRes.status).toBe(201);
    const event = await createRes.json();
    expect(event.description).toBe('A relaxed night ride around Warsaw.');

    const joinRes = await attend(authed(guestToken, `http://localhost/api/events/${event.id}/attend`, { method: 'POST' }), {
      params: Promise.resolve({ id: event.id }),
    });
    expect(joinRes.status).toBe(200);
    const joinBody = await joinRes.json();
    expect(joinBody).toMatchObject({ attending: true, attendeeCount: 1 });

    // Joining twice is idempotent.
    await attend(authed(guestToken, `http://localhost/api/events/${event.id}/attend`, { method: 'POST' }), {
      params: Promise.resolve({ id: event.id }),
    });

    const listRes = await listEvents(new Request('http://localhost/api/events?voivodeship=mazowieckie'));
    const rows = await listRes.json();
    const found = rows.find((r: { id: string }) => r.id === event.id);
    expect(found.attendeeCount).toBe(1);
    expect(found.attendees).toHaveLength(1);
    expect(found.attendees[0]).toMatchObject({ displayName: 'Attendee Guest' });
    expect(found.attendees[0].avatarUrl).toMatch(/^data:image\/svg\+xml,/);

    const leaveRes = await unattend(authed(guestToken, `http://localhost/api/events/${event.id}/attend`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: event.id }),
    });
    const leaveBody = await leaveRes.json();
    expect(leaveBody).toMatchObject({ attending: false, attendeeCount: 0 });
  });

  it('requires auth to join an event', async () => {
    const createRes = await createEvent(authed(hostToken, 'http://localhost/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Auth Required Meetup',
        type: 'meetup',
        voivodeship: 'mazowieckie',
        lat: 52.23,
        lon: 21.01,
        startsAt: new Date().toISOString(),
      }),
    }));
    const event = await createRes.json();
    const res = await attend(new Request(`http://localhost/api/events/${event.id}/attend`, { method: 'POST' }), {
      params: Promise.resolve({ id: event.id }),
    });
    expect(res.status).toBe(401);
  });
});
