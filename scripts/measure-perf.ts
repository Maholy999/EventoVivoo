import { pool } from '../src/db/client';
import { SessionRepository } from '../src/repositories/SessionRepository';

async function measure() {
  const repo = new SessionRepository(pool);

  console.log('⏱️ Midiendo rendimiento de consultas optimizadas con índices y agregación SQL...');

  // 1. Medir findPublishedWithCounts (catálogo completo con conteos en 1 query)
  const t0 = performance.now();
  const sessions = await repo.findPublishedWithCounts();
  const t1 = performance.now();
  const elapsedPublished = (t1 - t0).toFixed(2);
  console.log(`✅ Catálogo público (${sessions.length} sesiones): ${elapsedPublished} ms`);

  // 2. Medir findByOrganizerWithStats para organizador
  const orgRes = await pool.query("SELECT id FROM users WHERE role = 'organizer' LIMIT 1");
  const orgId = orgRes.rows[0].id;

  const t2 = performance.now();
  const orgSessions = await repo.findByOrganizerWithStats(orgId);
  const t3 = performance.now();
  const elapsedOrg = (t3 - t2).toFixed(2);
  console.log(`✅ Operación en vivo organizador (${orgSessions.length} sesiones): ${elapsedOrg} ms`);

  await pool.end();
}

measure().catch(console.error);
