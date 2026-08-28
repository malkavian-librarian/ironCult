import { NextResponse } from 'next/server';
import { getCrewLeaderboard } from '@/lib/leaderboard/queries';

export async function GET() {
  const rows = await getCrewLeaderboard();
  return NextResponse.json(rows);
}
