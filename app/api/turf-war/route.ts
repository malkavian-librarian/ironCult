import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pickOwner } from '@/lib/turf-war/ownership';

export async function GET() {
  const result = await db.execute(sql`
    SELECT r.district, c.id as "crewId", c.name as "crewName", COUNT(r.id)::int as count
    FROM routes r
    JOIN riders ri ON ri.id = r.owner_id
    JOIN crews c ON c.id = ri.crew_id
    WHERE r.district IS NOT NULL
    GROUP BY r.district, c.id, c.name
    ORDER BY count DESC, c.name
  `);
  const owners = pickOwner(result.rows as { crewId: string; crewName: string; district: string; count: number }[]);
  return NextResponse.json(owners);
}
