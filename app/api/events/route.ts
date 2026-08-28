import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { isHappeningNow } from '@/lib/events/happening-now';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { title, type, voivodeship, lat, lon, startsAt } = await req.json();
    if (!title || !type || !voivodeship || lat == null || lon == null || !startsAt) {
      return NextResponse.json({ error: 'title, type, voivodeship, lat, lon, startsAt are required' }, { status: 400 });
    }
    const [event] = await db.insert(events).values({
      creatorId: riderId, title, type, voivodeship, lat, lon, startsAt: new Date(startsAt),
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
  return NextResponse.json(rows.map((e) => ({ ...e, happeningNow: isHappeningNow(e.startsAt) })));
}
