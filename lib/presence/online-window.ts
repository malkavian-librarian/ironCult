const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(updatedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - updatedAt.getTime() <= ONLINE_WINDOW_MS;
}
