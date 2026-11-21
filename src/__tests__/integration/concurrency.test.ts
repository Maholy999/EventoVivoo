import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as schema from '@/db/schema';
import { setupTestDb, teardownTestDb, cleanTables, pool, db } from './setup';
import { eq } from 'drizzle-orm';

const isDbAvailable = !!process.env.DATABASE_URL_TEST;

describe.skipIf(!isDbAvailable)('A1 - Concurrencia: última plaza', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTables();
  });

  it('10 solicitudes simultáneas para 1 plaza → exactamente 1 confirmada, 9 en espera', async () => {
    const [organizer] = await db
      .insert(schema.users)
      .values({
        email: 'org@test.com',
        password_hash: 'hash',
        role: 'organizer',
        name: 'Organizador',
      })
      .returning();

    const [session] = await db
      .insert(schema.sessions)
      .values({
        title: 'Sesión única',
        starts_at: new Date('2026-02-01T10:00:00Z'),
        ends_at: new Date('2026-02-01T12:00:00Z'),
        capacity: 1,
        status: 'published',
        organizer_id: organizer.id,
      })
      .returning();

    const participants = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        db
          .insert(schema.users)
          .values({
            email: `user${i}@test.com`,
            password_hash: 'hash',
            role: 'participant',
            name: `Usuario ${i}`,
          })
          .returning()
          .then((rows) => rows[0])
      )
    );

    async function enrollUser(userId: string): Promise<'confirmed' | 'waitlisted'> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const {
          rows: [sessionRow],
        } = await client.query('SELECT * FROM sessions WHERE id = $1 FOR UPDATE', [
          session.id,
        ]);

        const {
          rows: [countRow],
        } = await client.query(
          "SELECT COUNT(*) as count FROM enrollments WHERE session_id = $1 AND status = 'confirmed'",
          [session.id]
        );

        const confirmedCount = parseInt(countRow.count, 10);
        const status = confirmedCount < sessionRow.capacity ? 'confirmed' : 'waitlisted';

        let position: number | null = null;
        if (status === 'waitlisted') {
          const {
            rows: [posRow],
          } = await client.query(
            "SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM enrollments WHERE session_id = $1 AND status = 'waitlisted'",
            [session.id]
          );
          position = posRow.next_pos;
        }

        await client.query(
          'INSERT INTO enrollments (session_id, user_id, status, position) VALUES ($1, $2, $3, $4)',
          [session.id, userId, status, position]
        );

        await client.query('COMMIT');
        return status;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const results = await Promise.all(participants.map((p) => enrollUser(p.id)));

    const confirmed = results.filter((r) => r === 'confirmed');
    const waitlisted = results.filter((r) => r === 'waitlisted');

    expect(confirmed).toHaveLength(1);
    expect(waitlisted).toHaveLength(9);

    const enrollments = await db
      .select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.session_id, session.id));

    const confirmedInDb = enrollments.filter((e) => e.status === 'confirmed');
    const waitlistedInDb = enrollments.filter((e) => e.status === 'waitlisted');

    expect(confirmedInDb).toHaveLength(1);
    expect(waitlistedInDb).toHaveLength(9);
  });
});
