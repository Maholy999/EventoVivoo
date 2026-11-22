import { pool } from './client';

export async function ensureSchemaAndIndexes() {
  const client = await pool.connect();
  try {
    // 1. Añadir columna type a sessions si no existe
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sessions' AND column_name = 'type'
        ) THEN
          ALTER TABLE sessions ADD COLUMN type text NOT NULL DEFAULT 'taller';
        END IF;
      END $$;
    `);

    // 2. Crear índices de rendimiento (P6)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_organizer ON sessions(organizer_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_starts_at ON sessions(starts_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
      CREATE INDEX IF NOT EXISTS idx_enrollments_session_status ON enrollments(session_id, status);
      CREATE INDEX IF NOT EXISTS idx_enrollments_user_status ON enrollments(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_attendances_enrollment ON attendances(enrollment_id);
      CREATE INDEX IF NOT EXISTS idx_attendances_qr_token ON attendances(qr_token);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    `);
    console.log('✅ Esquema e índices de alto rendimiento asegurados.');
  } finally {
    client.release();
  }
}
