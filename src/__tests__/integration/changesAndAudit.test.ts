import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables, pool } from './setup';
import { SessionRepository } from '@/repositories/SessionRepository';
import { EnrollmentRepository } from '@/repositories/EnrollmentRepository';
import { AuditRepository } from '@/repositories/AuditRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { SessionManagementService } from '@/services/sessionManagementService';

const isDbAvailable = !!process.env.DATABASE_URL_TEST;

describe.skipIf(!isDbAvailable)('H3 Integración - R7, R8, R11, R12, F8', () => {
  let sessionRepo: SessionRepository;
  let enrollmentRepo: EnrollmentRepository;
  let auditRepo: AuditRepository;
  let notificationRepo: NotificationRepository;
  let service: SessionManagementService;

  beforeAll(async () => {
    await setupTestDb();
    sessionRepo = new SessionRepository(pool);
    enrollmentRepo = new EnrollmentRepository(pool);
    auditRepo = new AuditRepository(pool);
    notificationRepo = new NotificationRepository(pool);
    service = new SessionManagementService(
      pool,
      sessionRepo,
      enrollmentRepo,
      auditRepo,
      notificationRepo
    );
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTables();
  });

  it('R7 + R11 + F8: reduce aforo, degrada al último a lista de espera y crea auditoría y avisos', async () => {
    const org = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, role, name) VALUES ('org@test.com', 'h', 'organizer', 'Org') RETURNING id"
    );
    const orgId = org.rows[0].id;

    const s = await pool.query<{ id: string }>(
      `INSERT INTO sessions (title, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Taller Node', '2026-03-01 10:00:00Z', '2026-03-01 12:00:00Z', 2, 'published', $1)
       RETURNING id`,
      [orgId]
    );
    const sId = s.rows[0].id;

    const u1 = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, role, name) VALUES ('u1@test.com', 'h', 'participant', 'U1') RETURNING id"
    );
    const u2 = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, role, name) VALUES ('u2@test.com', 'h', 'participant', 'U2') RETURNING id"
    );

    // Inscribir u1 primero, u2 después (u2 será el degradado)
    await pool.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', '2026-03-01 08:00:00Z')",
      [sId, u1.rows[0].id]
    );
    await pool.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', '2026-03-01 08:30:00Z')",
      [sId, u2.rows[0].id]
    );

    // Reducir aforo de 2 a 1
    const res = await service.reduceCapacity({
      sessionId: sId,
      newCapacity: 1,
      changedBy: orgId,
    });

    expect(res.success).toBe(true);
    expect(res.demotedCount).toBe(1);

    // Verificar en BD que u2 ahora está en espera y u1 confirmado
    const enrU1 = await enrollmentRepo.findBySessionAndUser(sId, u1.rows[0].id);
    const enrU2 = await enrollmentRepo.findBySessionAndUser(sId, u2.rows[0].id);

    expect(enrU1?.status).toBe('confirmed');
    expect(enrU2?.status).toBe('waitlisted');
    expect(enrU2?.position).toBe(1);

    // Verificar aviso F8 recibido por u2
    const notifs = await notificationRepo.findByUser(u2.rows[0].id);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe('waitlisted');

    // Verificar bitácora R11
    const logs = await auditRepo.findByEntity('session', sId);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('capacity_reduction');
  });

  it('R14: rechaza modificación de sesión si el organizador no es el dueño', async () => {
    const org1 = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, role, name) VALUES ('org1@test.com', 'h', 'organizer', 'Org1') RETURNING id"
    );
    const org2 = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, role, name) VALUES ('org2@test.com', 'h', 'organizer', 'Org2') RETURNING id"
    );

    const s = await pool.query<{ id: string }>(
      `INSERT INTO sessions (title, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Sesión Org1', '2026-03-01 10:00:00Z', '2026-03-01 12:00:00Z', 10, 'published', $1)
       RETURNING id`,
      [org1.rows[0].id]
    );
    const sId = s.rows[0].id;

    // Org2 intenta reducir aforo de la sesión de Org1
    const resReduce = await service.reduceCapacity({
      sessionId: sId,
      newCapacity: 5,
      changedBy: org2.rows[0].id,
    });
    expect(resReduce.success).toBe(false);
    expect(resReduce.error).toContain('R14');

    // Org2 intenta cancelar la sesión de Org1
    const resCancel = await service.cancelSession({
      sessionId: sId,
      changedBy: org2.rows[0].id,
    });
    expect(resCancel.success).toBe(false);
    expect(resCancel.error).toContain('R14');
  });
});
