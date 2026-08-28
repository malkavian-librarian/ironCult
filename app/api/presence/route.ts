import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crews, presence, riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { riderCard } from '@/lib/demo/rider-card';
import { isOnline } from '@/lib/presence/online-window';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { lat, lon } = await req.json();
    if (lat == null || lon == null) {
      return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }
    await db
      .insert(presence)
      .values({ riderId, lat, lon, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presence.riderId, set: { lat, lon, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET() {
  const rows = await db
    .select({
      riderId: presence.riderId,
      displayName: riders.displayName,
      lat: presence.lat,
      lon: presence.lon,
      updatedAt: presence.updatedAt,
      crewId: riders.crewId,
      crewName: crews.name,
      motorcycle: riders.motorcycle,
      experience: riders.experience,
      style: riders.style,
      bio: riders.bio,
      pace: riders.pace,
      language: riders.language,
    })
    .from(presence)
    .innerJoin(riders, eq(presence.riderId, riders.id))
    .leftJoin(crews, eq(riders.crewId, crews.id));
  return NextResponse.json(
    rows
      .filter((r) => isOnline(r.updatedAt))
      .map((r) => ({
        riderId: r.riderId,
        displayName: r.displayName,
        lat: r.lat,
        lon: r.lon,
        crewId: r.crewId,
        crewName: r.crewName,
        ...riderCard(r),
      }))
  );
}
