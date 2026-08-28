export function decodeRiderId(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { riderId } = JSON.parse(json);
    return typeof riderId === 'string' ? riderId : null;
  } catch {
    return null;
  }
}
