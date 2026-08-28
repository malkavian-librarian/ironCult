const WINDOW_BEFORE_MS = 60 * 60 * 1000;
const WINDOW_AFTER_MS = 4 * 60 * 60 * 1000;

export function isHappeningNow(startsAt: Date, now: Date = new Date()): boolean {
  const diff = now.getTime() - startsAt.getTime();
  return diff >= -WINDOW_BEFORE_MS && diff <= WINDOW_AFTER_MS;
}
