import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '1rem', maxWidth: 640 }}>
      <div className="panel">
        <h1>ironCult</h1>
        <p>
          A Poland-only motorcycle social network. Log routes, rate other riders, join a crew,
          climb the leaderboards — and watch crews fight over Warsaw turf on the live map.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Link href="/settings"><button type="button">Settings &amp; Crew</button></Link>
          <Link href="/routes"><button type="button">Routes</button></Link>
          <Link href="/leaderboard"><button type="button">Leaderboard</button></Link>
        </div>
      </div>
    </div>
  );
}
