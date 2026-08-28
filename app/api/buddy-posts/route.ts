import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { buddyPosts, riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { voivodeship, plannedDate, note } = await req.json();
    if (!voivodeship || !plannedDate) {
      return NextResponse.json({ error: 'voivodeship and plannedDate are required' }, { status: 400 });
    }
    const [post] = await db.insert(buddyPosts).values({
      riderId, voivodeship, plannedDate: new Date(plannedDate), note: note ?? null,
    }).returning();
    return NextResponse.json(post, { status: 201 });
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
  if (voivodeship) conditions.push(eq(buddyPosts.voivodeship, voivodeship));
  if (date) conditions.push(sql`${buddyPosts.plannedDate}::date = ${date}::date`);

  const rows = await db
    .select({
      id: buddyPosts.id,
      voivodeship: buddyPosts.voivodeship,
      plannedDate: buddyPosts.plannedDate,
      note: buddyPosts.note,
      displayName: riders.displayName,
      style: riders.style,
      experience: riders.experience,
      pace: riders.pace,
      language: riders.language,
    })
    .from(buddyPosts)
    .innerJoin(riders, eq(buddyPosts.riderId, riders.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(buddyPosts.plannedDate);

  return NextResponse.json(rows);
}
