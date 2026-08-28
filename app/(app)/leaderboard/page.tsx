import { getCrewLeaderboard, getRiderLeaderboard } from '@/lib/leaderboard/queries';

export default async function LeaderboardPage() {
  const [crews, riders] = await Promise.all([getCrewLeaderboard(), getRiderLeaderboard()]);

  return (
    <div className="leaderboard-columns">
      <div className="panel">
        <h1>Crew Leaderboard</h1>
        <ol>
          {(crews as { crewId: string; crewName: string; routeCount: number }[]).map((c) => (
            <li key={c.crewId}>{c.crewName} — {c.routeCount} routes</li>
          ))}
        </ol>
      </div>
      <div className="panel">
        <h1>Individual Leaderboard</h1>
        <ol>
          {(riders as { riderId: string; displayName: string; routeCount: number }[]).map((r) => (
            <li key={r.riderId}>{r.displayName} — {r.routeCount} routes</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
