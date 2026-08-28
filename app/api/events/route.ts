import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, presence } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { isHappeningNow } from '@/lib/events/happening-now';
import { findWarsawDistrict } from '@/lib/geo/voivodeship';
import { countNearbyRiders } from '@/lib/map/checkins';
import { districtColor } from '@/lib/map/district-colors';
import { isOnline } from '@/lib/presence/online-window';
import { riderAvatarUrl } from '@/lib/demo/rider-card';
import { crewColor } from '@/lib/crew-color';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { title, type, voivodeship, lat, lon, startsAt, description } = await req.json();
    if (!title || !type || !voivodeship || lat == null || lon == null || !startsAt) {
      return NextResponse.json({ error: 'title, type, voivodeship, lat, lon, startsAt are required' }, { status: 400 });
    }
    const [event] = await db.insert(events).values({
      creatorId: riderId, title, type, voivodeship, lat, lon, startsAt: new Date(startsAt), description: description || null,
    }).returning();
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voivodeship = searchParams.get('voivodeship');
  const date = searchParams.get('date');

  const conditions = [];
  if (voivodeship) conditions.push(eq(events.voivodeship, voivodeship));
  if (date) conditions.push(sql`${events.startsAt}::date = ${date}::date`);

  const rows = await db.query.events.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: (e, { asc }) => asc(e.startsAt),
  });

  const presenceRows = await db
    .select({
      lat: presence.lat,
      lon: presence.lon,
      updatedAt: presence.updatedAt,
    })
    .from(presence);
  const onlinePresenceRows = presenceRows
    .filter((row) => isOnline(row.updatedAt))
    .map(({ lat, lon }) => ({ lat, lon }));

  const attendeeRows = rows.length
    ? await db.execute(sql`
        SELECT ea.event_id as "eventId", r.id as "riderId", r.display_name as "displayName", r.crew_id as "crewId"
        FROM event_attendees ea
        JOIN riders r ON r.id = ea.rider_id
        WHERE ea.event_id IN (${sql.join(rows.map((e) => sql`${e.id}`), sql`, `)})
        ORDER BY ea.created_at ASC
      `)
    : { rows: [] as { eventId: string; riderId: string; displayName: string; crewId: string | null }[] };

  const byEvent = new Map<string, { riderId: string; displayName: string; crewId: string | null }[]>();
  for (const row of attendeeRows.rows as { eventId: string; riderId: string; displayName: string; crewId: string | null }[]) {
    const list = byEvent.get(row.eventId) ?? [];
    list.push(row);
    byEvent.set(row.eventId, list);
  }

  return NextResponse.json(rows.map((e) => {
    const district = findWarsawDistrict(e.lat, e.lon);
    const attendees = byEvent.get(e.id) ?? [];
    return {
      ...e,
      happeningNow: isHappeningNow(e.startsAt),
      district,
      districtColor: districtColor(district),
      checkedInCount: countNearbyRiders({ lat: e.lat, lon: e.lon }, onlinePresenceRows),
      attendeeCount: attendees.length,
      attendees: attendees.slice(0, 10).map((a) => ({
        riderId: a.riderId,
        displayName: a.displayName,
        avatarUrl: riderAvatarUrl(a.displayName, crewColor(a.crewId)),
      })),
    };
  }));
}
