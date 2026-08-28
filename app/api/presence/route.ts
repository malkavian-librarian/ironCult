import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { presence, riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
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
    .select({ riderId: presence.riderId, displayName: riders.displayName, lat: presence.lat, lon: presence.lon, updatedAt: presence.updatedAt })
    .from(presence)
    .innerJoin(riders, eq(presence.riderId, riders.id));
  return NextResponse.json(
    rows
      .filter((r) => isOnline(r.updatedAt))
      .map((r) => ({ riderId: r.riderId, displayName: r.displayName, lat: r.lat, lon: r.lon }))
  );
}
