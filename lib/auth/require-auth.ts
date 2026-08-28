import { verifyToken } from './jwt';

export class AuthError extends Error {}

export function requireAuth(req: Request): { riderId: string } {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('Missing bearer token');
  }
  const token = header.slice('Bearer '.length);
  try {
    return { riderId: verifyToken(token).riderId };
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}
