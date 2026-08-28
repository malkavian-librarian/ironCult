import Link from 'next/link';

export function NavBar() {
  return (
    <nav data-testid="top-nav" className="top-nav">
      <Link href="/">ironCult</Link>
      <Link href="/routes">Routes</Link>
      <Link href="/leaderboard">Leaderboard</Link>
      <Link href="/buddy-finder">Buddy Finder</Link>
      <Link href="/events">Events</Link>
      <Link href="/settings">Settings &amp; Crew</Link>
    </nav>
  );
}
