import { crewColor } from '@/lib/crew-color';

type RiderCardInput = {
  riderId: string;
  displayName: string;
  crewId: string | null;
  crewName: string | null;
  motorcycle: string | null;
  experience: string | null;
  style: string | null;
};

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function riderRank(experience: string | null): string {
  if (experience?.toLowerCase().includes('founder')) return 'Founder';
  if (experience?.toLowerCase().includes('captain')) return 'Road Captain';
  if (experience?.toLowerCase().includes('prospect')) return 'Prospect';
  return 'Rider';
}

export function riderAvatarUrl(displayName: string, markerColor: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'R';
  const safeInitials = escapeSvgText(initials);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#080808"/><circle cx="48" cy="48" r="36" fill="${markerColor}"/><text x="48" y="56" text-anchor="middle" font-family="Arial" font-size="24" font-weight="800" fill="#f3efe6">${safeInitials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function riderCard(row: RiderCardInput) {
  const isCurrentDemoUser = row.displayName.toLowerCase() === 'flyerone';
  const markerColor = isCurrentDemoUser ? 'hsl(5, 92%, 54%)' : crewColor(row.crewId);
  return {
    rank: riderRank(row.experience),
    clubName: row.crewName ?? 'Guest rider',
    motorcycle: row.motorcycle ?? 'Motorcycle not set',
    avatarUrl: riderAvatarUrl(row.displayName, markerColor),
    markerColor,
    isCurrentDemoUser,
  };
}
