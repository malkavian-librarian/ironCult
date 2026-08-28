import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req: Request) {
  const { email, password, displayName } = await req.json();
  if (!email || !password || !displayName) {
    return NextResponse.json({ error: 'email, password, displayName are required' }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  const [rider] = await db.insert(riders).values({ email, passwordHash, displayName }).returning();
  const token = signToken({ riderId: rider.id });
  return NextResponse.json({ token, riderId: rider.id }, { status: 201 });
}
