import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables, pool, db } from './setup';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

const isDbAvailable = !!process.env.DATABASE_URL_TEST;

describe.skipIf(!isDbAvailable)('A2 - Promoción desde lista de espera', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await cleanTables();
  });

  it('al cancelar confirmado, promueve al primer elegible en FIFO saltando al que tiene choque', async () => {
    const [organizer] = await db
      .insert(schema.users)
      .values({
        email: 'org@test.com',
        password_hash: 'hash',
        role: 'organizer',
        name: 'Org',
      })
      .returning();

    const [mainSession] = await db
      .insert(schema.sessions)
      .values({
        title: 'Sesión Principal',
        starts_at: new Date('2026-02-01T10:00:00Z'),
        ends_at: new Date('2026-02-01T12:00:00Z'),
        capacity: 1,
        status: 'published',
        organizer_id: organizer.id,
      })
      .returning();

    const [conflictSession] = await db
      .insert(schema.sessions)
      .values({
        title: 'Sesión Conflictiva',
        starts_at: new Date('2026-02-01T11:00:00Z'),
        ends_at: new Date('2026-02-01T13:00:00Z'),
        capacity: 10,
        status: 'published',
        organizer_id: organizer.id,
      })
      .returning();

    const [confirmed, waiter1, waiter2] = await Promise.all([
      db
        .insert(schema.users)
        .values({
          email: 'confirmed@test.com',
          password_hash: 'hash',
          role: 'participant',
          name: 'Confirmado',
        })
        .returning()
        .then((r) => r[0]),
      db
        .insert(schema.users)
        .values({
          email: 'waiter1@test.com',
          password_hash: 'hash',
          role: 'participant',
          name: 'Waiter1',
        })
        .returning()
        .then((r) => r[0]),
      db
        .insert(schema.users)
        .values({
          email: 'waiter2@test.com',
          password_hash: 'hash',
          role: 'participant',
          name: 'Waiter2',
        })
        .returning()
        .then((r) => r[0]),
    ]);

    await db.insert(schema.enrollments).values({
      session_id: mainSession.id,
      user_id: confirmed.id,
      status: 'confirmed',
      position: null,
    });

    await db.insert(schema.enrollments).values({
      session_id: conflictSession.id,
      user_id: waiter1.id,
      status: 'confirmed',
      position: null,
    });
    await db.insert(schema.enrollments).values({
      session_id: mainSession.id,
      user_id: waiter1.id,
      status: 'waitlisted',
      position: 1,
    });

    await db.insert(schema.enrollments).values({
      session_id: mainSession.id,
      user_id: waiter2.id,
      status: 'waitlisted',
      position: 2,
    });

    async function cancelAndPromote(enrollmentUserId: string, sessionId: string) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query('SELECT * FROM sessions WHERE id = $1 FOR UPDATE', [
          sessionId,
        ]);

        await client.query(
          "UPDATE enrollments SET status = 'cancelled', updated_at = now() WHERE session_id = $1 AND user_id = $2",
          [sessionId, enrollmentUserId]
        );

        const { rows: waitlist } = await client.query(
          "SELECT e.*, u.id as uid FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.session_id = $1 AND e.status = 'waitlisted' ORDER BY e.position ASC",
          [sessionId]
        );

        const {
          rows: [sessionInfo],
        } = await client.query(
          'SELECT starts_at, ends_at FROM sessions WHERE id = $1',
          [sessionId]
        );

        let promoted = false;
        for (const waiter of waitlist) {
          const { rows: conflicts } = await client.query(
            `SELECT e.id FROM enrollments e
             JOIN sessions s ON s.id = e.session_id
             WHERE e.user_id = $1
               AND e.status = 'confirmed'
               AND e.session_id != $2
               AND s.starts_at < $3
               AND s.ends_at > $4`,
            [waiter.user_id, sessionId, sessionInfo.ends_at, sessionInfo.starts_at]
          );

          if (conflicts.length === 0) {
            await client.query(
              "UPDATE enrollments SET status = 'confirmed', position = NULL, updated_at = now() WHERE id = $1",
              [waiter.id]
            );
            promoted = true;
            break;
          }
        }

        await client.query('COMMIT');
        return promoted;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const promoted = await cancelAndPromote(confirmed.id, mainSession.id);
    expect(promoted).toBe(true);

    const enrollments = await db
      .select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.session_id, mainSession.id));

    const confirmedList = enrollments.filter((e) => e.status === 'confirmed');
    const waitlistedList = enrollments.filter((e) => e.status === 'waitlisted');

    expect(confirmedList).toHaveLength(1);
    expect(confirmedList[0].user_id).toBe(waiter2.id);
    expect(waitlistedList).toHaveLength(1);
    expect(waitlistedList[0].user_id).toBe(waiter1.id);
  });
});
