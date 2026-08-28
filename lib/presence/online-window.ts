// Wide enough to cover a full hackathon demo session — seeded demo riders are static
// DB rows with no browser re-pinging them, so a short window would drop them off the
// map minutes after seeding. Real riders still go offline promptly relative to a demo's
// timescale once they stop pinging (PresenceToggle pings every 10s while active).
const ONLINE_WINDOW_MS = 4 * 60 * 60 * 1000;

export function isOnline(updatedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - updatedAt.getTime() < ONLINE_WINDOW_MS;
}
