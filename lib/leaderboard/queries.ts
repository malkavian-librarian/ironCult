import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function getCrewLeaderboard() {
  const result = await db.execute(sql`
    SELECT c.id as "crewId", c.name as "crewName", COUNT(r.id)::int as "routeCount"
    FROM crews c
    LEFT JOIN riders ri ON ri.crew_id = c.id
    LEFT JOIN routes r ON r.owner_id = ri.id
    GROUP BY c.id, c.name
    ORDER BY "routeCount" DESC
  `);
  return result.rows;
}

export async function getCrewRosters() {
  const result = await db.execute(sql`
    SELECT
      c.id as "crewId",
      c.name as "crewName",
      r.id as "riderId",
      r.display_name as "displayName",
      r.motorcycle as "motorcycle",
      r.experience as "experience"
    FROM crews c
    JOIN riders r ON r.crew_id = c.id
    ORDER BY c.name ASC, r.display_name ASC
  `);
  return result.rows as {
    crewId: string;
    crewName: string;
    riderId: string;
    displayName: string;
    motorcycle: string | null;
    experience: string | null;
  }[];
}

export async function getRiderLeaderboard() {
  const result = await db.execute(sql`
    SELECT ri.id as "riderId", ri.display_name as "displayName", COUNT(r.id)::int as "routeCount"
    FROM riders ri
    LEFT JOIN routes r ON r.owner_id = ri.id
    GROUP BY ri.id, ri.display_name
    ORDER BY "routeCount" DESC
  `);
  return result.rows;
}
