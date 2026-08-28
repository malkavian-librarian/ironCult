import { NextResponse } from 'next/server';
import { getRiderLeaderboard } from '@/lib/leaderboard/queries';

export async function GET() {
  const rows = await getRiderLeaderboard();
  return NextResponse.json(rows);
}
