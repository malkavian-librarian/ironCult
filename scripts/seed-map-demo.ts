import { config } from 'dotenv';
config({ path: '.env.local' });

import { like, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crews, riders, presence, events } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';

const DEMO_EVENTS = [
  { title: 'IronCult Hackathon Checkpoint', type: 'hackathon', lat: 52.22769, lon: 21.00481, district: 'srodmiescie', riderCount: 9 },
  { title: 'Koneser Bike Night', type: 'bikenight', lat: 52.254444, lon: 21.043889, district: 'praga-polnoc', riderCount: 7 },
  { title: 'Oczki After Ride', type: 'bikenight', lat: 52.2243525, lon: 21.0019246, district: 'ochota', riderCount: 5 },
  { title: 'National Stadium Throttle Meet', type: 'meetup', lat: 52.2394, lon: 21.0456, district: 'praga-poludnie', riderCount: 6 },
  { title: 'Pole Mokotowskie Night Loop', type: 'meetup', lat: 52.2109, lon: 21.0053, district: 'mokotow', riderCount: 4 },
] as const;

const DEMO_CREWS = [
  'Iron Cult',
  'Srodmiescie Pistons',
  'Praga Night Shift',
  'Mokotow Carb Unit',
  'Wola Sparks',
  'Guest Nomads',
  'Guest Vistula',
] as const;

const MOTORCYCLES = ['Triumph Bonneville T120', 'Yamaha MT-07', 'Kawasaki Z900', 'Honda CB650R', 'Suzuki SV650', 'Ducati Scrambler', 'BMW R nineT', 'KTM Duke 390'];
const STYLES = ['cruiser', 'sport', 'naked', 'adventure', 'cafe'];
const EXPERIENCES = ['Founder', 'Road Captain', 'Prospect', 'Rider', 'Rider', 'Rider'];
const PACES = ['chill', 'brisk', 'spirited'];

function offsetAround(center: { lat: number; lon: number }, index: number) {
  const ring = 0.00045 + (index % 3) * 0.00018;
  const angle = (index * 137.5 * Math.PI) / 180;
  return {
    lat: center.lat + Math.sin(angle) * ring,
    lon: center.lon + Math.cos(angle) * ring,
  };
}

async function main() {
  console.log('Cleaning previous demo data...');

  const demoRiderRows = await db.select({ id: riders.id }).from(riders).where(like(riders.email, '%@demo.ironcult.local'));
  const demoRiderIds = demoRiderRows.map((r) => r.id);

  await db.delete(events);
  if (demoRiderIds.length > 0) {
    await db.delete(presence).where(inArray(presence.riderId, demoRiderIds));
  }
  await db.delete(riders).where(like(riders.email, '%@demo.ironcult.local'));

  console.log('Creating demo crews...');
  const passwordHash = await hashPassword('hunter22');
  const crewMap = new Map<string, string>();

  for (const crewName of DEMO_CREWS) {
    const existing = await db.query.crews.findFirst({ where: (c, { eq }) => eq(c.name, crewName) });
    if (existing) {
      crewMap.set(crewName, existing.id);
    } else {
      const [crew] = await db.insert(crews).values({ name: crewName }).returning();
      crewMap.set(crewName, crew.id);
    }
  }

  console.log('Creating FlyerOne demo rider...');
  const [flyerOne] = await db.insert(riders).values({
    email: 'flyerone@demo.ironcult.local',
    passwordHash,
    displayName: 'FlyerOne',
    motorcycle: 'Triumph Bonneville T120',
    style: 'cafe',
    experience: 'Founder',
    pace: 'brisk',
    language: 'pl/en',
    crewId: crewMap.get('Iron Cult')!,
  }).returning();

  const flyOffset = offsetAround({ lat: DEMO_EVENTS[0].lat, lon: DEMO_EVENTS[0].lon }, 0);
  await db.insert(presence).values({
    riderId: flyerOne.id,
    lat: flyOffset.lat,
    lon: flyOffset.lon,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: presence.riderId,
    set: { lat: flyOffset.lat, lon: flyOffset.lon, updatedAt: new Date() },
  });

  console.log('Seeding events and riders...');
  const startsAt = new Date(Date.now() - 15 * 60 * 1000);
  let totalRiders = 1;

  for (const ev of DEMO_EVENTS) {
    await db.insert(events).values({
      creatorId: flyerOne.id,
      title: ev.title,
      type: ev.type,
      voivodeship: 'mazowieckie',
      lat: ev.lat,
      lon: ev.lon,
      startsAt,
    });

    const riderCount = ev.title === 'IronCult Hackathon Checkpoint' ? ev.riderCount - 1 : ev.riderCount;

    for (let i = 0; i < riderCount; i++) {
      const crewIdx = (i + 1) % DEMO_CREWS.length;
      const crewName = DEMO_CREWS[crewIdx];
      const crewId = crewMap.get(crewName)!;
      const slug = `${ev.district}-${i}`;
      const displayName = `${ev.district} Rider ${i + 1}`;
      const email = `map-demo-${slug}-${ev.district}@demo.ironcult.local`;
      const offset = offsetAround({ lat: ev.lat, lon: ev.lon }, i + 1);
      const experience = EXPERIENCES[i % EXPERIENCES.length];

      const [rider] = await db.insert(riders).values({
        email,
        passwordHash,
        displayName,
        motorcycle: MOTORCYCLES[i % MOTORCYCLES.length],
        style: STYLES[i % STYLES.length],
        experience,
        pace: PACES[i % PACES.length],
        language: 'pl/en',
        crewId,
      }).returning();

      await db.insert(presence).values({
        riderId: rider.id,
        lat: offset.lat,
        lon: offset.lon,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: presence.riderId,
        set: { lat: offset.lat, lon: offset.lon, updatedAt: new Date() },
      });

      totalRiders++;
    }
  }

  console.log(`Seeded ${DEMO_EVENTS.length} events and ${totalRiders} demo riders for the live map.`);
  console.log(`Hackathon anchor: FlyerOne at ${DEMO_EVENTS[0].lat}, ${DEMO_EVENTS[0].lon}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
