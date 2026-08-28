import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const rider = await db.query.riders.findFirst({ where: eq(riders.email, email) });
  if (!rider || !(await verifyPassword(password, rider.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  const token = signToken({ riderId: rider.id });
  return NextResponse.json({ token, riderId: rider.id }, { status: 200 });
}
