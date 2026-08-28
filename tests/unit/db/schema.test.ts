import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { crews } from '@/lib/db/schema';

describe('db schema', () => {
  it('can insert and read a crew', async () => {
    const [created] = await db.insert(crews).values({ name: `test-crew-${Date.now()}` }).returning();
    expect(created.id).toBeDefined();
    const found = await db.query.crews.findFirst({ where: (c, { eq }) => eq(c.id, created.id) });
    expect(found?.name).toBe(created.name);
  });
});
