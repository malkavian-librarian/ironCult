import { getCrewLeaderboard, getCrewRosters, getRiderLeaderboard } from '@/lib/leaderboard/queries';
import { riderAvatarUrl, riderRank } from '@/lib/demo/rider-card';
import { crewColor } from '@/lib/crew-color';

export default async function LeaderboardPage() {
  const [crews, riders, roster] = await Promise.all([getCrewLeaderboard(), getRiderLeaderboard(), getCrewRosters()]);

  const rostersByCrew = new Map<string, { crewName: string; members: typeof roster }>();
  for (const member of roster) {
    const entry = rostersByCrew.get(member.crewId) ?? { crewName: member.crewName, members: [] };
    entry.members.push(member);
    rostersByCrew.set(member.crewId, entry);
  }

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
      <div className="panel">
        <h1>Crew Rosters</h1>
        {[...rostersByCrew.entries()].map(([crewId, { crewName, members }]) => (
          <div key={crewId} style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>{crewName}</h2>
            <div className="crew-roster">
              {members.map((m) => (
                <div key={m.riderId} className="crew-roster-member">
                  <img
                    className="crew-roster-avatar"
                    src={riderAvatarUrl(m.displayName, crewColor(m.crewId))}
                    alt=""
                  />
                  <span>
                    <strong>{m.displayName}</strong>
                    <span style={{ color: 'var(--mist)', fontFamily: 'var(--font-data)' }}>
                      {' '}· {riderRank(m.experience)}{m.motorcycle ? ` · ${m.motorcycle}` : ''}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {rostersByCrew.size === 0 && <p style={{ color: 'var(--mist)' }}>No crews yet.</p>}
      </div>
    </div>
  );
}
