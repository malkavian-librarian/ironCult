'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Map', icon: '\u{1F5FA}\uFE0F' },
  { href: '/routes', label: 'Routes', icon: '\u{1F6E3}\uFE0F' },
  { href: '/leaderboard', label: 'Ranks', icon: '\u{1F3C6}' },
  { href: '/buddy-finder', label: 'Buddies', icon: '\u{1F91D}' },
  { href: '/events', label: 'Events', icon: '\u{1F4C5}' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      data-testid="bottom-nav"
      className="bottom-nav"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="bottom-nav-tab" aria-current={active ? 'page' : undefined}>
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ProfileLink() {
  return (
    <Link href="/settings" data-testid="profile-link" className="profile-link" aria-label="Settings and profile">
      <span aria-hidden="true">{'\u{1F464}'}</span>
    </Link>
  );
}
