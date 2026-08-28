import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function GET(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const rider = await db.query.riders.findFirst({ where: eq(riders.id, riderId) });
    if (!rider) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { passwordHash: _unused, ...safe } = rider;
    return NextResponse.json(safe);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const updates = await req.json();
    const allowed = ['displayName', 'bio', 'motorcycle', 'style', 'experience', 'pace', 'language'] as const;
    const patch: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof updates[key] === 'string') patch[key] = updates[key];
    }
    const [updated] = await db.update(riders).set(patch).where(eq(riders.id, riderId)).returning();
    const { passwordHash: _unused, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
