import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { eventAttendees } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

async function attendeeCount(eventId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventAttendees)
    .where(eq(eventAttendees.eventId, eventId));
  return count;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { riderId } = requireAuth(req);
    const { id: eventId } = await params;
    const existing = await db.query.eventAttendees.findFirst({
      where: and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.riderId, riderId)),
    });
    if (!existing) {
      await db.insert(eventAttendees).values({ eventId, riderId });
    }
    return NextResponse.json({ attending: true, attendeeCount: await attendeeCount(eventId) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { riderId } = requireAuth(req);
    const { id: eventId } = await params;
    await db.delete(eventAttendees).where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.riderId, riderId)));
    return NextResponse.json({ attending: false, attendeeCount: await attendeeCount(eventId) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
