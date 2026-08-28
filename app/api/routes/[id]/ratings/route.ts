import { NextResponse } from 'next/server';
import { eq, and, avg } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ratings } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { riderId } = requireAuth(req);
    const { id: routeId } = await params;
    const { score } = await req.json();
    if (typeof score !== 'number' || score < 1 || score > 5) {
      return NextResponse.json({ error: 'score must be 1-5' }, { status: 400 });
    }
    const existing = await db.query.ratings.findFirst({
      where: and(eq(ratings.routeId, routeId), eq(ratings.raterId, riderId)),
    });
    if (existing) {
      await db.update(ratings).set({ score }).where(eq(ratings.id, existing.id));
    } else {
      await db.insert(ratings).values({ routeId, raterId: riderId, score });
    }
    const [{ average }] = await db.select({ average: avg(ratings.score) }).from(ratings).where(eq(ratings.routeId, routeId));
    return NextResponse.json({ average: Number(average) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
