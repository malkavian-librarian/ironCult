import Link from 'next/link';

export function NavBar() {
  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--line)' }}>
      <Link href="/">ironCult</Link>
      <Link href="/routes">Routes</Link>
      <Link href="/settings">Settings &amp; Crew</Link>
      <Link href="/leaderboard">Leaderboard</Link>
      <Link href="/buddy-finder">Buddy Finder</Link>
      <Link href="/events">Events</Link>
      <Link href="/map">Live Map</Link>
    </nav>
  );
}
