import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables, db } from './setup';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateQrToken } from '@/domain/qr';
import { evaluateAttendance } from '@/domain/attendance';

const isDbAvailable = !!process.env.DATABASE_URL_TEST;

describe.skipIf(!isDbAvailable)('A3 - Idempotencia de asistencia (QR)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await cleanTables();
  });

  it('registrar el mismo QR dos veces no duplica la asistencia y devuelve la hora original', async () => {
    const [org] = await db
      .insert(schema.users)
      .values({
        email: 'org@test.com',
        password_hash: 'hash',
        role: 'organizer',
        name: 'Org',
      })
      .returning();

    const [session] = await db
      .insert(schema.sessions)
      .values({
        title: 'Sesión QR',
        starts_at: new Date('2026-02-01T10:00:00Z'),
        ends_at: new Date('2026-02-01T12:00:00Z'),
        capacity: 10,
        status: 'published',
        organizer_id: org.id,
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        email: 'user@test.com',
        password_hash: 'hash',
        role: 'participant',
        name: 'Usuario',
      })
      .returning();

    const [enrollment] = await db
      .insert(schema.enrollments)
      .values({
        session_id: session.id,
        user_id: user.id,
        status: 'confirmed',
        position: null,
      })
      .returning();

    const token = generateQrToken();

    const existing1 = await db
      .select()
      .from(schema.attendances)
      .where(eq(schema.attendances.qr_token, token));

    const r1 = evaluateAttendance(
      true,
      existing1[0] ? { recordedAt: existing1[0].recorded_at } : null
    );
    expect(r1.kind).toBe('recorded');

    if (r1.kind === 'recorded') {
      await db.insert(schema.attendances).values({
        enrollment_id: enrollment.id,
        qr_token: token,
      });
    }

    const existing2 = await db
      .select()
      .from(schema.attendances)
      .where(eq(schema.attendances.qr_token, token));

    const r2 = evaluateAttendance(
      true,
      existing2[0] ? { recordedAt: existing2[0].recorded_at } : null
    );
    expect(r2.kind).toBe('already_registered');

    const all = await db
      .select()
      .from(schema.attendances)
      .where(eq(schema.attendances.qr_token, token));
    expect(all).toHaveLength(1);

    if (r2.kind === 'already_registered') {
      expect(r2.originalRecordedAt.getTime()).toEqual(existing2[0].recorded_at.getTime());
    }
  });
});
