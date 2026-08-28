import { config } from 'dotenv';
config({ path: '.env.local' });

import { eq, inArray } from 'drizzle-orm';
import { hashPassword } from '../lib/auth/password';

const DEMO_PASSWORD = 'hunter22';
const DEMO_EMAIL_SUFFIX = '@demo.ironcult.local';

type DemoRider = {
  slug: string;
  displayName: string;
  motorcycle: string;
  style: string;
  experience: string;
  pace: string;
};

type DemoCrew = {
  name: string;
  members: DemoRider[];
};

const DEMO_CREWS: DemoCrew[] = [
  {
    name: 'Iron Cult',
    members: [
      { slug: 'marta-nowak', displayName: 'Marta Nowak', motorcycle: 'Triumph Bonneville T120', style: 'cafe racer', experience: 'Founder, 12 years riding', pace: 'spirited' },
      { slug: 'tomasz-wisniewski', displayName: 'Tomasz Wisniewski', motorcycle: 'Ducati Scrambler Icon', style: 'street', experience: 'Road Captain, 8 years riding', pace: 'spirited' },
      { slug: 'agnieszka-kowalska', displayName: 'Agnieszka Kowalska', motorcycle: 'Royal Enfield Interceptor 650', style: 'touring', experience: '5 years riding', pace: 'relaxed' },
      { slug: 'piotr-zielinski', displayName: 'Piotr Zielinski', motorcycle: 'Kawasaki Z900RS', style: 'street', experience: 'Prospect, 1 year riding', pace: 'spirited' },
    ],
  },
  {
    name: 'Warszawa Chrome Riders',
    members: [
      { slug: 'kasia-mazur', displayName: 'Kasia Mazur', motorcycle: 'Harley-Davidson Sportster S', style: 'cruiser', experience: 'Founder, 15 years riding', pace: 'relaxed' },
      { slug: 'lukasz-dabrowski', displayName: 'Lukasz Dabrowski', motorcycle: 'Indian Scout Bobber', style: 'cruiser', experience: 'Road Captain, 10 years riding', pace: 'relaxed' },
      { slug: 'ola-szymanska', displayName: 'Ola Szymanska', motorcycle: 'Triumph Speed Twin 900', style: 'cafe racer', experience: '3 years riding', pace: 'spirited' },
    ],
  },
  {
    name: 'Krakow Ridge Runners',
    members: [
      { slug: 'michal-wojcik', displayName: 'Michal Wojcik', motorcycle: 'BMW R nineT', style: 'street', experience: 'Founder, 11 years riding', pace: 'spirited' },
      { slug: 'natalia-kaczmarek', displayName: 'Natalia Kaczmarek', motorcycle: 'Yamaha XSR700', style: 'street', experience: '4 years riding', pace: 'spirited' },
      { slug: 'jakub-piotrowski', displayName: 'Jakub Piotrowski', motorcycle: 'Honda CB650R', style: 'street', experience: 'Prospect, 2 years riding', pace: 'relaxed' },
    ],
  },
  {
    name: 'Praga Night Wolves',
    members: [
      { slug: 'ewa-grabowska', displayName: 'Ewa Grabowska', motorcycle: 'Suzuki SV650', style: 'street', experience: 'Road Captain, 7 years riding', pace: 'spirited' },
      { slug: 'rafal-pawlowski', displayName: 'Rafal Pawlowski', motorcycle: 'KTM 890 Duke', style: 'street', experience: '6 years riding', pace: 'spirited' },
      { slug: 'zofia-michalska', displayName: 'Zofia Michalska', motorcycle: 'Triumph Trident 660', style: 'street', experience: '2 years riding', pace: 'relaxed' },
    ],
  },
];

type DemoEvent = {
  title: string;
  type: string;
  voivodeship: string;
  lat: number;
  lon: number;
  startsAt: () => Date;
  description: string;
  attendeeSlugs: string[];
};

const DEMO_EVENTS: DemoEvent[] = [
  {
    title: 'IronCult Hackathon Checkpoint',
    type: 'meetup',
    voivodeship: 'mazowieckie',
    lat: 52.22769,
    lon: 21.00481,
    startsAt: () => new Date(Date.now() - 15 * 60 * 1000),
    description: 'Quick coffee-and-throttle stop for anyone riding past the hackathon venue tonight. Come say hi, check out the build.',
    attendeeSlugs: ['marta-nowak', 'tomasz-wisniewski', 'agnieszka-kowalska', 'piotr-zielinski', 'kasia-mazur', 'lukasz-dabrowski', 'ola-szymanska', 'michal-wojcik', 'natalia-kaczmarek', 'jakub-piotrowski', 'ewa-grabowska', 'rafal-pawlowski'],
  },
  {
    title: 'Koneser Bike Night',
    type: 'bikenight',
    voivodeship: 'mazowieckie',
    lat: 52.254444,
    lon: 21.043889,
    startsAt: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    description: 'Monthly Praga bike night at Koneser - food trucks, live mechanics corner, and a slow cruise back over the river after dark.',
    attendeeSlugs: ['ewa-grabowska', 'rafal-pawlowski', 'zofia-michalska', 'kasia-mazur'],
  },
  {
    title: 'Krakow Old Town Ride-Out',
    type: 'rally',
    voivodeship: 'malopolskie',
    lat: 50.0619,
    lon: 19.9368,
    startsAt: () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    description: 'Saturday morning ride starting at the Ridge Runners clubhouse, looping through the Vistula boulevards before breakfast.',
    attendeeSlugs: ['michal-wojcik', 'natalia-kaczmarek', 'jakub-piotrowski'],
  },
  {
    title: 'Chrome Riders Sunday Cruise',
    type: 'meetup',
    voivodeship: 'mazowieckie',
    lat: 52.1672,
    lon: 20.9679,
    startsAt: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    description: 'Easy-pace Sunday cruise south of the city for cruiser and touring bikes - no highway, all backroads, stop for pierogi halfway.',
    attendeeSlugs: ['kasia-mazur', 'lukasz-dabrowski', 'ola-szymanska', 'agnieszka-kowalska'],
  },
  {
    title: 'Pole Mokotowskie Trackday Prep',
    type: 'trackday',
    voivodeship: 'mazowieckie',
    lat: 52.2109,
    lon: 21.0053,
    startsAt: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    description: 'Open garage session to check tire pressure, chain slack, and brake pads before next weekend\'s trackday. Bring your own tools.',
    attendeeSlugs: ['piotr-zielinski', 'tomasz-wisniewski', 'rafal-pawlowski', 'jakub-piotrowski', 'natalia-kaczmarek'],
  },
];

async function main() {
  const { db } = await import('../lib/db');
  const { crews, riders, events, eventAttendees } = await import('../lib/db/schema');

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const crewIdByName = new Map<string, string>();
  for (const crew of DEMO_CREWS) {
    const existing = await db.query.crews.findFirst({ where: (c, { eq }) => eq(c.name, crew.name) });
    if (existing) {
      crewIdByName.set(crew.name, existing.id);
    } else {
      const [inserted] = await db.insert(crews).values({ name: crew.name }).returning();
      crewIdByName.set(crew.name, inserted.id);
    }
  }

  const riderIdBySlug = new Map<string, string>();
  for (const crew of DEMO_CREWS) {
    const crewId = crewIdByName.get(crew.name)!;
    for (const member of crew.members) {
      const email = `${member.slug}${DEMO_EMAIL_SUFFIX}`;
      const existing = await db.query.riders.findFirst({ where: (r, { eq }) => eq(r.email, email) });
      if (existing) {
        await db.update(riders).set({
          displayName: member.displayName,
          motorcycle: member.motorcycle,
          style: member.style,
          experience: member.experience,
          pace: member.pace,
          language: 'pl/en',
          crewId,
        }).where(eq(riders.id, existing.id));
        riderIdBySlug.set(member.slug, existing.id);
      } else {
        const [inserted] = await db.insert(riders).values({
          email,
          passwordHash,
          displayName: member.displayName,
          motorcycle: member.motorcycle,
          style: member.style,
          experience: member.experience,
          pace: member.pace,
          language: 'pl/en',
          crewId,
        }).returning();
        riderIdBySlug.set(member.slug, inserted.id);
      }
    }
  }

  const demoRiderIds = [...riderIdBySlug.values()];
  await db.delete(eventAttendees).where(inArray(eventAttendees.riderId, demoRiderIds));
  await db.delete(events);

  const creatorId = riderIdBySlug.get('marta-nowak')!;
  for (const demoEvent of DEMO_EVENTS) {
    const [inserted] = await db.insert(events).values({
      creatorId,
      title: demoEvent.title,
      type: demoEvent.type,
      voivodeship: demoEvent.voivodeship,
      lat: demoEvent.lat,
      lon: demoEvent.lon,
      startsAt: demoEvent.startsAt(),
      description: demoEvent.description,
    }).returning();

    for (const slug of demoEvent.attendeeSlugs) {
      const riderId = riderIdBySlug.get(slug);
      if (riderId) {
        await db.insert(eventAttendees).values({ eventId: inserted.id, riderId });
      }
    }
  }

  console.log(`Seeded ${DEMO_CREWS.length} crews, ${demoRiderIds.length} demo riders, and ${DEMO_EVENTS.length} events with descriptions and RSVPs.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
