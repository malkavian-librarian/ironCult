import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { crewId } = await req.json();
    if (!crewId) return NextResponse.json({ error: 'crewId is required' }, { status: 400 });
    const [updated] = await db.update(riders).set({ crewId }).where(eq(riders.id, riderId)).returning();
    return NextResponse.json({ crewId: updated.crewId });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
