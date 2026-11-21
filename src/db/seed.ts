import { pool } from './client';
import { hashPassword } from '@/domain/password';
import { generateQrToken } from '@/domain/qr';

export async function runSeed() {
  console.log('🌱 Sembrando datos para EventoVivo...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Limpiar datos previos
    await client.query('TRUNCATE surveys, audit_logs, notifications, attendances, enrollments, sessions, users CASCADE');

    // 2. Crear Usuarios (1 Organizador + 6 Participantes)
    const orgPass = await hashPassword('Admin123!');
    const userPass = await hashPassword('Pass123!');

    const orgRes = await client.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ('org@eventovivo.edu', $1, 'organizer', 'Dra. Elena Vasquez (Organizador)')
       RETURNING id`,
      [orgPass]
    );
    const orgId = orgRes.rows[0].id;

    const participantsData = [
      { email: 'sofia@universidad.edu', name: 'Sofia Reyes' },
      { email: 'carlos@universidad.edu', name: 'Carlos Mendoza' },
      { email: 'lucia@universidad.edu', name: 'Lucia Morales' },
      { email: 'mateo@universidad.edu', name: 'Mateo Castillo' },
      { email: 'valentina@universidad.edu', name: 'Valentina Gomez' },
      { email: 'diego@universidad.edu', name: 'Diego Torres' },
    ];

    const usersMap = new Map<string, string>();
    usersMap.set('org', orgId);

    for (const p of participantsData) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, name)
         VALUES ($1, $2, 'participant', $3)
         RETURNING id`,
        [p.email, userPass, p.name]
      );
      usersMap.set(p.email, res.rows[0].id);
    }

    // 3. Crear 6 Sesiones Universitarias
    // Base de fechas: mañana a las 09:00
    const baseDay = new Date();
    baseDay.setDate(baseDay.getDate() + 1);
    baseDay.setHours(9, 0, 0, 0);

    const d = (hoursOffset: number, durationHours: number) => {
      const starts = new Date(baseDay);
      starts.setHours(baseDay.getHours() + hoursOffset);
      const ends = new Date(starts);
      ends.setHours(starts.getHours() + durationHours);
      return { starts_at: starts, ends_at: ends };
    };

    // Sesión 1: Llena con lista de espera (capacidad 2)
    const t1 = d(0, 2); // 09:00 - 11:00
    const s1Res = await client.query(
      `INSERT INTO sessions (title, description, location, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Hackatón Web3: Contratos Inteligentes', 'Taller práctico de Solidity y despliegue en testnet.', 'Laboratorio de Cómputo 3', $1, $2, 2, 'published', $3)
       RETURNING id`,
      [t1.starts_at, t1.ends_at, orgId]
    );
    const s1Id = s1Res.rows[0].id;

    // Sesión 2: Taller IA (Choque A: 11:00 - 13:00)
    const t2 = d(2, 2); // 11:00 - 13:00
    const s2Res = await client.query(
      `INSERT INTO sessions (title, description, location, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Taller de Inteligencia Artificial y LLMs', 'Construcción de agentes y RAG con modelos abiertos.', 'Auditorio Principal Alfa', $1, $2, 20, 'published', $3)
       RETURNING id`,
      [t2.starts_at, t2.ends_at, orgId]
    );
    const s2Id = s2Res.rows[0].id;

    // Sesión 3: Ciberseguridad (Choque B con Sesión 2: 12:00 - 14:00)
    const t3 = d(3, 2); // 12:00 - 14:00 (se solapa con Sesión 2)
    await client.query(
      `INSERT INTO sessions (title, description, location, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Ciberseguridad Ofensiva: Red Teaming', 'Análisis de vulnerabilidades web y ejercicios CTF en vivo.', 'Sala de Redes y Seguridad', $1, $2, 15, 'published', $3)
       RETURNING id`,
      [t3.starts_at, t3.ends_at, orgId]
    );

    // Sesión 4: Casi llena (capacidad 4, 3 confirmados)
    const t4 = d(5, 2); // 14:00 - 16:00
    const s4Res = await client.query(
      `INSERT INTO sessions (title, description, location, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Arquitectura Cloud Nativa con Kubernetes', 'Orquestación de microservicios y despliegues Zero-Downtime.', 'Auditorio Beta', $1, $2, 4, 'published', $3)
       RETURNING id`,
      [t4.starts_at, t4.ends_at, orgId]
    );
    const s4Id = s4Res.rows[0].id;

    // Sesión 5: Ya con asistencia registrada
    const t5 = d(7, 2); // 16:00 - 18:00
    const s5Res = await client.query(
      `INSERT INTO sessions (title, description, location, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Diseño de Producto y Design Thinking', 'Prototipado rápido y validación con usuarios universitarios.', 'Taller de Innovación 1', $1, $2, 10, 'published', $3)
       RETURNING id`,
      [t5.starts_at, t5.ends_at, orgId]
    );
    const s5Id = s5Res.rows[0].id;

    // Sesión 6: En borrador (draft)
    const t6 = d(24, 2); // Pasado mañana
    await client.query(
      `INSERT INTO sessions (title, description, location, starts_at, ends_at, capacity, status, organizer_id)
       VALUES ('Workshop de Rust para Sistemas Embebidos', 'Programación de bajo nivel para microcontroladores.', 'Laboratorio Maker', $1, $2, 12, 'draft', $3)
       RETURNING id`,
      [t6.starts_at, t6.ends_at, orgId]
    );

    // 4. Inscripciones y Estados de prueba
    // Sesión 1 (Llena): Sofia y Carlos confirmados; Lucia en lista de espera (#1)
    const enrSofia1 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now() - interval '2 hours') RETURNING id",
      [s1Id, usersMap.get('sofia@universidad.edu')]
    );
    const enrCarlos1 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now() - interval '1 hour') RETURNING id",
      [s1Id, usersMap.get('carlos@universidad.edu')]
    );
    await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, position, enrolled_at) VALUES ($1, $2, 'waitlisted', 1, now()) RETURNING id",
      [s1Id, usersMap.get('lucia@universidad.edu')]
    );

    // Tokens QR para confirmados de Sesión 1
    await client.query("INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)", [enrSofia1.rows[0].id, generateQrToken()]);
    await client.query("INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)", [enrCarlos1.rows[0].id, generateQrToken()]);

    // Sesión 2: Mateo confirmado (generará choque si intenta inscribirse en Sesión 3)
    const enrMateo2 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now()) RETURNING id",
      [s2Id, usersMap.get('mateo@universidad.edu')]
    );
    await client.query("INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)", [enrMateo2.rows[0].id, generateQrToken()]);

    // Sesión 4 (Casi llena: 3 de 4): Sofia, Mateo, Valentina
    const enrSofia4 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now()) RETURNING id",
      [s4Id, usersMap.get('sofia@universidad.edu')]
    );
    const enrMateo4 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now()) RETURNING id",
      [s4Id, usersMap.get('mateo@universidad.edu')]
    );
    const enrVal4 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now()) RETURNING id",
      [s4Id, usersMap.get('valentina@universidad.edu')]
    );
    await client.query("INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)", [enrSofia4.rows[0].id, generateQrToken()]);
    await client.query("INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)", [enrMateo4.rows[0].id, generateQrToken()]);
    await client.query("INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)", [enrVal4.rows[0].id, generateQrToken()]);

    // Sesión 5 (Con asistencia ya registrada): Diego confirmado + asistencia ya guardada + encuesta respondida
    const enrDiego5 = await client.query(
      "INSERT INTO enrollments (session_id, user_id, status, enrolled_at) VALUES ($1, $2, 'confirmed', now() - interval '3 hours') RETURNING id",
      [s5Id, usersMap.get('diego@universidad.edu')]
    );
    const diegoToken = '5f4dcc3b5aa765d61d8327deb882cf99';
    await client.query(
      "INSERT INTO attendances (enrollment_id, qr_token, recorded_at) VALUES ($1, $2, now() - interval '30 minutes')",
      [enrDiego5.rows[0].id, diegoToken]
    );

    // Encuesta de satisfacción para Diego
    await client.query(
      "INSERT INTO surveys (enrollment_id, rating, comment, created_at) VALUES ($1, 5, '¡Excelente facilitador y dinámicas muy aplicables al campus!', now())",
      [enrDiego5.rows[0].id]
    );

    // Auditoría inicial R11
    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, changed_by, previous_value, new_value)
       VALUES ('session', $1, 'session_published', $2, '{"status":"draft"}', '{"status":"published"}')`,
      [s1Id, orgId]
    );

    await client.query('COMMIT');
    console.log('✅ Seed completado con éxito.');
    console.log('--------------------------------------------------');
    console.log('ORGANIZADOR:');
    console.log('  Email: org@eventovivo.edu | Contraseña: Admin123!');
    console.log('PARTICIPANTES:');
    console.log('  sofia@universidad.edu     | Contraseña: Pass123! (Confirmada en Sesión 1 y 4)');
    console.log('  carlos@universidad.edu    | Contraseña: Pass123! (Confirmado en Sesión 1)');
    console.log('  lucia@universidad.edu     | Contraseña: Pass123! (En lista de espera #1 en Sesión 1)');
    console.log('  mateo@universidad.edu     | Contraseña: Pass123! (Confirmado en Sesión 2 [choque])');
    console.log('  valentina@universidad.edu | Contraseña: Pass123! (Confirmada en Sesión 4)');
    console.log('  diego@universidad.edu     | Contraseña: Pass123! (Asistencia y encuesta registradas en Sesión 5)');
    console.log('--------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error ejecutando seed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
