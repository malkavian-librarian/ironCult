import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crews } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

const POSTGRES_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if ('code' in err && err.code === POSTGRES_UNIQUE_VIOLATION) return true;
  if ('cause' in err) return isUniqueViolation((err as { cause: unknown }).cause);
  return false;
}

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const all = await db.query.crews.findMany();
    return NextResponse.json(all);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    requireAuth(req);
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    try {
      const [crew] = await db.insert(crews).values({ name }).returning();
      return NextResponse.json(crew, { status: 201 });
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return NextResponse.json({ error: 'Crew name already taken' }, { status: 409 });
      }
      throw dbError;
    }
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
