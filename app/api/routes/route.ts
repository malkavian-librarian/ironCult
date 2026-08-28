import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { routes } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { findVoivodeship, findWarsawDistrict } from '@/lib/geo/voivodeship';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { title, startLat, startLon, endLat, endLon, difficulty, bikeType, sceneryTags } = await req.json();
    const voivodeship = findVoivodeship(startLat, startLon);
    if (!voivodeship) {
      return NextResponse.json({ error: 'Route start point is outside Poland' }, { status: 400 });
    }
    const district = findWarsawDistrict(startLat, startLon);
    const [route] = await db.insert(routes).values({
      ownerId: riderId, title, startLat, startLon, endLat, endLon, difficulty, bikeType, sceneryTags, voivodeship, district,
    }).returning();
    return NextResponse.json(route, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET() {
  const all = await db.query.routes.findMany({ orderBy: (r, { desc }) => desc(r.createdAt) });
  return NextResponse.json(all);
}
