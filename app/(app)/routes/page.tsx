import { eq, avg, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { routes, ratings } from '@/lib/db/schema';
import { RatingControl } from './rating-control';

async function getRoutesWithRatings() {
  const all = await db.query.routes.findMany({ orderBy: desc(routes.createdAt) });
  return Promise.all(
    all.map(async (route) => {
      const [{ average }] = await db.select({ average: avg(ratings.score) }).from(ratings).where(eq(ratings.routeId, route.id));
      return { ...route, averageRating: average === null ? null : Number(average) };
    })
  );
}

export default async function RoutesPage() {
  const routesWithRatings = await getRoutesWithRatings();

  return (
    <div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <h1>Routes</h1>
      {routesWithRatings.map((route) => (
        <div key={route.id} className="panel" style={{ marginBottom: '1rem' }}>
          <h2>{route.title}</h2>
          <p>{route.voivodeship} · {route.difficulty} · {route.bikeType}</p>
          <p>Average rating: {route.averageRating ?? 'No ratings yet'}</p>
          <RatingControl routeId={route.id} />
        </div>
      ))}
    </div>
  );
}
