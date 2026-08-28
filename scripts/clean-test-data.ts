import { config } from 'dotenv';
config({ path: '.env.local' });

import { sql } from 'drizzle-orm';

async function main() {
  const { db } = await import('../lib/db');

  const testRiderIds = sql`(SELECT id FROM riders WHERE email LIKE '%@example.com')`;

  const ratingsDeleted = await db.execute(sql`
    DELETE FROM ratings
    WHERE rater_id IN ${testRiderIds}
       OR route_id IN (SELECT id FROM routes WHERE owner_id IN ${testRiderIds})
  `);
  const routesDeleted = await db.execute(sql`DELETE FROM routes WHERE owner_id IN ${testRiderIds}`);
  const buddyPostsDeleted = await db.execute(sql`DELETE FROM buddy_posts WHERE rider_id IN ${testRiderIds}`);
  const presenceDeleted = await db.execute(sql`DELETE FROM presence WHERE rider_id IN ${testRiderIds}`);
  const attendeesDeleted = await db.execute(sql`DELETE FROM event_attendees WHERE rider_id IN ${testRiderIds}`);
  const eventsDeleted = await db.execute(sql`DELETE FROM events WHERE creator_id IN ${testRiderIds}`);
  const ridersDeleted = await db.execute(sql`DELETE FROM riders WHERE email LIKE '%@example.com'`);
  const crewsDeleted = await db.execute(sql`
    DELETE FROM crews
    WHERE id NOT IN (SELECT DISTINCT crew_id FROM riders WHERE crew_id IS NOT NULL)
  `);

  console.log('Deleted test data:', {
    ratings: ratingsDeleted.rowCount ?? 0,
    routes: routesDeleted.rowCount ?? 0,
    buddyPosts: buddyPostsDeleted.rowCount ?? 0,
    presence: presenceDeleted.rowCount ?? 0,
    eventAttendees: attendeesDeleted.rowCount ?? 0,
    events: eventsDeleted.rowCount ?? 0,
    riders: ridersDeleted.rowCount ?? 0,
    crews: crewsDeleted.rowCount ?? 0,
  });
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
