import { beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as createEvent, GET as listEvents } from '@/app/api/events/route';
import { POST as pingPresence } from '@/app/api/presence/route';
import { db } from '@/lib/db';

const eventTitle = `Map Detail Event ${Date.now()}`;
let creatorToken: string;
let nearbyOneToken: string;
let nearbyTwoToken: string;
let farToken: string;

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
  return new Request(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
}

beforeAll(async () => {
  creatorToken = await registerRider('Map Event Creator');
  nearbyOneToken = await registerRider('Map Nearby One');
  nearbyTwoToken = await registerRider('Map Nearby Two');
  farToken = await registerRider('Map Far Rider');
});

describe('events map detail contract', () => {
  it('returns district color and nearby online rider count for happening-now Warsaw events', async () => {
    await db.execute(sql`
      DELETE FROM presence
      USING riders
      WHERE presence.rider_id = riders.id
      AND (
        riders.email LIKE 'map-%@example.com'
        OR riders.email LIKE 'flyerone-%@example.com'
      )
    `);

    await createEvent(authed(creatorToken, 'http://localhost/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: eventTitle,
        type: 'bikenight',
        voivodeship: 'mazowieckie',
        lat: 52.22769,
        lon: 21.00481,
        startsAt: new Date().toISOString(),
      }),
    }));

    await pingPresence(authed(nearbyOneToken, 'http://localhost/api/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 52.228, lon: 21.005 }),
    }));
    await pingPresence(authed(nearbyTwoToken, 'http://localhost/api/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 52.2271, lon: 21.0042 }),
    }));
    await pingPresence(authed(farToken, 'http://localhost/api/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 52.238, lon: 21.02 }),
    }));

    const res = await listEvents(new Request('http://localhost/api/events?voivodeship=mazowieckie'));
    const body = await res.json();
    const event = body.find((row: { title: string }) => row.title === eventTitle);

    expect(event).toMatchObject({
      checkedInCount: 2,
      happeningNow: true,
    });
    expect(event.district).not.toBeNull();
    expect(event.districtColor).toMatch(/^hsl/);
  });
});
