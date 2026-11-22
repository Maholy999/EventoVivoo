import { pool } from './client';
import { hashPassword } from '@/domain/password';
import { generateQrToken } from '@/domain/qr';
import { ensureSchemaAndIndexes } from './init-db';

export async function runSeed() {
  console.log('🌱 Sembrando datos realistas para EventoVivo (Hito 1)...');

  // Asegurar esquema e índices
  await ensureSchemaAndIndexes();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Limpiar datos previos
    await client.query('TRUNCATE surveys, audit_logs, notifications, attendances, enrollments, sessions, users CASCADE');

    // 2. Crear 2 Organizadores (R15, P5)
    const orgPass = await hashPassword('Admin123!');
    const userPass = await hashPassword('Pass123!');

    const org1Res = await client.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ('org1@eventovivo.edu', $1, 'organizer', 'Dr. Roberto Salazar (Decano Ingeniería)')
       RETURNING id`,
      [orgPass]
    );
    const org1Id = org1Res.rows[0].id;

    const org2Res = await client.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ('org2@eventovivo.edu', $1, 'organizer', 'Dra. Elena Vasquez (Dir. Ciberseguridad)')
       RETURNING id`,
      [orgPass]
    );
    const org2Id = org2Res.rows[0].id;

    // 3. Crear 50 Participantes generados
    const participantNames = [
      'Sofia Reyes', 'Carlos Mendoza', 'Lucia Morales', 'Mateo Castillo', 'Valentina Gomez',
      'Diego Torres', 'Camila Herrera', 'Alejandro Vargas', 'Mariana Rios', 'Sebastian Castro',
      'Isabella Ortiz', 'Gabriel Silva', 'Daniela Rojas', 'Nicolas Navarro', 'Valeria Delgado',
      'Joaquin Medina', 'Paula Romero', 'Andres Molina', 'Fernanda Paredes', 'Lucas Campos',
      'Martina Vega', 'Esteban Aguilar', 'Catalina Figueroa', 'Javier Miranda', 'Victoria Pena',
      'Manuel Benitez', 'Abril Cabrera', 'Felipe Santos', 'Florencia Luna', 'Ignacio Carrillo',
      'Julieta Ponce', 'Alonso Espinoza', 'Renata Sandoval', 'Tomas Fuentes', 'Bianca Rivas',
      'Rodrigo Soto', 'Constanza Bravo', 'Emilio Lara', 'Antonella Guzman', 'Maximiliano Cardenas',
      'Laura Villalobos', 'Gonzalo Valenzuela', 'Paloma Ibanez', 'Damian Tapia', 'Agustina Mora',
      'Bruno Salinas', 'Elena Godoy', 'Alvaro Orellana', 'Amparo Calderon', 'Cristobal Duarte'
    ];

    const participantIds: string[] = [];
    for (let i = 0; i < participantNames.length; i++) {
      const email = `participante${i + 1}@universidad.edu`;
      const name = participantNames[i];
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, name)
         VALUES ($1, $2, 'participant', $3)
         RETURNING id`,
        [email, userPass, name]
      );
      participantIds.push(res.rows[0].id);
    }

    // 4. Fechas de sesiones: base mañana a las 09:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const slot = (hourOffset: number, durationHours: number) => {
      const starts = new Date(tomorrow);
      starts.setHours(tomorrow.getHours() + hourOffset);
      const ends = new Date(starts);
      ends.setHours(starts.getHours() + durationHours);
      return { starts_at: starts, ends_at: ends };
    };

    // 5. Crear 14 Sesiones con cupos entre 20 y 60 (mezclando taller, hackatón, conferencia, encuentro)
    type SessionDef = {
      title: string;
      type: 'taller' | 'hackatón' | 'conferencia' | 'encuentro';
      description: string;
      location: string;
      starts_at: Date;
      ends_at: Date;
      capacity: number;
      status: 'draft' | 'published' | 'cancelled';
      organizer_id: string;
    };

    const s1Slot = slot(0, 3); // 09:00 - 12:00
    const s2Slot = slot(2, 2); // 11:00 - 13:00 (Choque con s3)
    const s3Slot = slot(3, 2); // 12:00 - 14:00 (Choque con s2)
    const s4Slot = slot(5, 2); // 14:00 - 16:00
    const s5Slot = slot(6, 2); // 15:00 - 17:00
    const s6Slot = slot(7, 2); // 16:00 - 18:00
    const s7Slot = slot(8, 2); // 17:00 - 19:00
    const s8Slot = slot(9, 2); // 18:00 - 20:00
    const s9Slot = slot(-1, 2); // 08:00 - 10:00 (Asistencia y encuesta)
    const s10Slot = slot(24, 4); // Pasado mañana 09:00 - 13:00 (Borrador)
    const s11Slot = slot(24, 2); // Pasado mañana (Cancelada)
    const s12Slot = slot(26, 2); // Pasado mañana
    const s13Slot = slot(28, 2); // Pasado mañana
    const s14Slot = slot(30, 2); // Pasado mañana (Cierre)

    const sessionsList: SessionDef[] = [
      // S1: Llena con espera de 7 (cupo 25, 25 confirmados + 7 espera)
      {
        title: 'Hackatón Web3: Contratos Inteligentes y DeFi',
        type: 'hackatón',
        description: 'Desarrollo intensivo de aplicaciones descentralizadas en Ethereum y Polygon con mentores de la industria.',
        location: 'Laboratorio de Innovación 4',
        starts_at: s1Slot.starts_at,
        ends_at: s1Slot.ends_at,
        capacity: 25,
        status: 'published',
        organizer_id: org1Id,
      },
      // S2: Casi llena (cupo 30, 28 confirmados = 93.3%) - Choque con S3
      {
        title: 'Taller Avanzado de Agentes Inteligentes y LLMs',
        type: 'taller',
        description: 'Construcción práctica de arquitecturas multi-agente con orquestación autónoma y herramientas MCP.',
        location: 'Auditorio Principal Alfa',
        starts_at: s2Slot.starts_at,
        ends_at: s2Slot.ends_at,
        capacity: 30,
        status: 'published',
        organizer_id: org1Id,
      },
      // S3: Conferencia (cupo 50, 25 confirmados = 50%) - Choque con S2
      {
        title: 'Conferencia Magistral: El Futuro de la IA Generativa',
        type: 'conferencia',
        description: 'Visión estratégica y técnica sobre la siguiente década de modelos fundacionales en la educación y empresa.',
        location: 'Aula Magna Central',
        starts_at: s3Slot.starts_at,
        ends_at: s3Slot.ends_at,
        capacity: 50,
        status: 'published',
        organizer_id: org2Id,
      },
      // S4: Taller Kubernetes (cupo 35, 21 confirmados = 60%)
      {
        title: 'Taller: Microservicios y Cloud Native con Kubernetes',
        type: 'taller',
        description: 'Despliegues Zero-Downtime, service mesh y observabilidad con Prometheus y Grafana en clúster local.',
        location: 'Sala de Cómputo Especializada',
        starts_at: s4Slot.starts_at,
        ends_at: s4Slot.ends_at,
        capacity: 35,
        status: 'published',
        organizer_id: org1Id,
      },
      // S5: Encuentro Comunidades (cupo 40, 16 confirmados = 40%)
      {
        title: 'Encuentro de Comunidades Tech y Open Source',
        type: 'encuentro',
        description: 'Espacio de networking, charlas relámpago y colaboración comunitaria entre desarrolladores y entusiastas.',
        location: 'Plaza Tecnológica / Terraza',
        starts_at: s5Slot.starts_at,
        ends_at: s5Slot.ends_at,
        capacity: 40,
        status: 'published',
        organizer_id: org2Id,
      },
      // S6: Conferencia Seguridad (cupo 40, 30 confirmados = 75%)
      {
        title: 'Conferencia: Seguridad Ofensiva y Amenazas Cuánticas',
        type: 'conferencia',
        description: 'Análisis de vectores de ataque modernos, ingeniería social avanzada y criptografía post-cuántica.',
        location: 'Auditorio Beta',
        starts_at: s6Slot.starts_at,
        ends_at: s6Slot.ends_at,
        capacity: 40,
        status: 'published',
        organizer_id: org2Id,
      },
      // S7: Taller Visualización (cupo 30, 11 confirmados = 36.7%)
      {
        title: 'Taller: Visualización de Datos con React y Canvas',
        type: 'taller',
        description: 'Representación visual de grandes volúmenes de datos en tiempo real mediante WebGL y HTML5 Canvas.',
        location: 'Laboratorio de Diseño Digital',
        starts_at: s7Slot.starts_at,
        ends_at: s7Slot.ends_at,
        capacity: 30,
        status: 'published',
        organizer_id: org1Id,
      },
      // S8: Casi vacía (cupo 30, 2 confirmados = 6.7%)
      {
        title: 'Encuentro de Investigación Doctoral y Postgrados',
        type: 'encuentro',
        description: 'Presentación de líneas de investigación doctoral, pasantías y convocatorias de becas académicas.',
        location: 'Sala de Seminarios 102',
        starts_at: s8Slot.starts_at,
        ends_at: s8Slot.ends_at,
        capacity: 30,
        status: 'published',
        organizer_id: org2Id,
      },
      // S9: Con asistencias y encuestas (cupo 40, 20 confirmados, 15 asistieron, 10 encuestas)
      {
        title: 'Conferencia: Ética en Modelos de Lenguaje Masivos',
        type: 'conferencia',
        description: 'Dilemas éticos, mitigación de sesgos algorítmicos y gobernanza de la inteligencia artificial moderna.',
        location: 'Aula Magna Central',
        starts_at: s9Slot.starts_at,
        ends_at: s9Slot.ends_at,
        capacity: 40,
        status: 'published',
        organizer_id: org1Id,
      },
      // S10: En Borrador (cupo 40)
      {
        title: 'Hackatón Universitario: Ciudades Inteligentes e IoT',
        type: 'hackatón',
        description: 'Prototipado rápido de soluciones urbanas con sensores LoRaWAN y procesamiento edge computing.',
        location: 'Laboratorio IoT',
        starts_at: s10Slot.starts_at,
        ends_at: s10Slot.ends_at,
        capacity: 40,
        status: 'draft',
        organizer_id: org2Id,
      },
      // S11: Cancelada (cupo 25)
      {
        title: 'Taller de Criptografía de Curvas Elípticas',
        type: 'taller',
        description: 'Matemática aplicada y primitivas criptográficas para desarrolladores de sistemas seguros.',
        location: 'Aula 204',
        starts_at: s11Slot.starts_at,
        ends_at: s11Slot.ends_at,
        capacity: 25,
        status: 'cancelled',
        organizer_id: org1Id,
      },
      // S12: Encuentro Liderazgo (cupo 30, 15 confirmados = 50%)
      {
        title: 'Encuentro de Liderazgo y Mentoría en Tecnología',
        type: 'encuentro',
        description: 'Mentorías one-on-one y paneles de carrera profesional con líderes de ingeniería de software.',
        location: 'Terraza Central',
        starts_at: s12Slot.starts_at,
        ends_at: s12Slot.ends_at,
        capacity: 30,
        status: 'published',
        organizer_id: org2Id,
      },
      // S13: Taller Automatización (cupo 25, 16 confirmados = 64%)
      {
        title: 'Taller: Pruebas Automatizadas y Performance Testing',
        type: 'taller',
        description: 'Diseño de pruebas de carga distribuidas con k6, Playwright y análisis de cuellos de botella.',
        location: 'Laboratorio 2',
        starts_at: s13Slot.starts_at,
        ends_at: s13Slot.ends_at,
        capacity: 25,
        status: 'published',
        organizer_id: org1Id,
      },
      // S14: Conferencia Cierre (cupo 60, 42 confirmados = 70%)
      {
        title: 'Conferencia de Clausura: Tendencias de Ingeniería 2027',
        type: 'conferencia',
        description: 'Cierre del evento con panel de expertos sobre computación cuántica, robótica y sistemas autónomos.',
        location: 'Aula Magna Central',
        starts_at: s14Slot.starts_at,
        ends_at: s14Slot.ends_at,
        capacity: 60,
        status: 'published',
        organizer_id: org2Id,
      },
    ];

    const sessionIds: string[] = [];
    for (const s of sessionsList) {
      const res = await client.query(
        `INSERT INTO sessions (title, type, description, location, starts_at, ends_at, capacity, status, organizer_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [s.title, s.type, s.description, s.location, s.starts_at, s.ends_at, s.capacity, s.status, s.organizer_id]
      );
      sessionIds.push(res.rows[0].id);
    }

    // 6. Asignar inscripciones realistas
    // Helper para inscribir
    const enrollParticipant = async (sessionId: string, userId: string, status: 'confirmed' | 'waitlisted', pos?: number) => {
      const enrRes = await client.query(
        `INSERT INTO enrollments (session_id, user_id, status, position)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [sessionId, userId, status, pos ?? null]
      );
      const enrId = enrRes.rows[0].id;

      if (status === 'confirmed') {
        await client.query(
          `INSERT INTO attendances (enrollment_id, qr_token)
           VALUES ($1, $2)`,
          [enrId, generateQrToken()]
        );
      }
      return enrId;
    };

    // S1: 25 confirmados + 7 en lista de espera (participantes 0..31)
    for (let i = 0; i < 25; i++) {
      await enrollParticipant(sessionIds[0], participantIds[i], 'confirmed');
    }
    for (let i = 25; i < 32; i++) {
      await enrollParticipant(sessionIds[0], participantIds[i], 'waitlisted', i - 25 + 1);
    }

    // S2: 28 confirmados (participantes 0..27)
    for (let i = 0; i < 28; i++) {
      await enrollParticipant(sessionIds[1], participantIds[i], 'confirmed');
    }

    // S3: 25 confirmados (participantes 25..49) - Nota: participantes 25, 26, 27 están en S2 y S3, pero S3 es independiente
    for (let i = 25; i < 50; i++) {
      await enrollParticipant(sessionIds[2], participantIds[i], 'confirmed');
    }

    // S4: 21 confirmados (participantes 0..20)
    for (let i = 0; i < 21; i++) {
      await enrollParticipant(sessionIds[3], participantIds[i], 'confirmed');
    }

    // S5: 16 confirmados (participantes 10..25)
    for (let i = 10; i < 26; i++) {
      await enrollParticipant(sessionIds[4], participantIds[i], 'confirmed');
    }

    // S6: 30 confirmados (participantes 15..44)
    for (let i = 15; i < 45; i++) {
      await enrollParticipant(sessionIds[5], participantIds[i], 'confirmed');
    }

    // S7: 11 confirmados (participantes 30..40)
    for (let i = 30; i < 41; i++) {
      await enrollParticipant(sessionIds[6], participantIds[i], 'confirmed');
    }

    // S8: 2 confirmados (participantes 48..49) - casi vacía
    for (let i = 48; i < 50; i++) {
      await enrollParticipant(sessionIds[7], participantIds[i], 'confirmed');
    }

    // S9: 20 confirmados, 15 asistieron, 10 encuestas
    const s9EnrIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const enrId = await enrollParticipant(sessionIds[8], participantIds[i], 'confirmed');
      s9EnrIds.push(enrId);
    }

    // Marcar asistencia para 15 de ellos (índices 0..14)
    for (let i = 0; i < 15; i++) {
      const attDate = new Date(s9Slot.starts_at);
      attDate.setMinutes(attDate.getMinutes() + 10 + i * 2);
      await client.query(
        `UPDATE attendances
         SET recorded_at = $1
         WHERE enrollment_id = $2`,
        [attDate, s9EnrIds[i]]
      );
    }

    // Crear 10 encuestas para los que asistieron (índices 0..9)
    const surveyComments = [
      'Excelente exposición de los dilemas éticos.',
      'Muy clara la explicación sobre sesgos algorítmicos.',
      'Me gustó la profundidad técnica de la conferencia.',
      'El ponente respondió todas las dudas del público.',
      'Gran contenido, súper relevante para mi trabajo de grado.',
      'Muy buena organización y puntualidad.',
      'Faltó un poco más de tiempo para preguntas.',
      'Excelente nivel académico y reflexivo.',
      'Inspirador para aplicar principios éticos en nuestros proyectos.',
      'De las mejores sesiones del congreso.'
    ];

    for (let i = 0; i < 10; i++) {
      const rating = 4 + (i % 2); // 4 o 5 estrellas
      await client.query(
        `INSERT INTO surveys (enrollment_id, rating, comment)
         VALUES ($1, $2, $3)`,
        [s9EnrIds[i], rating, surveyComments[i]]
      );
    }

    // S12: 15 confirmados (participantes 5..19)
    for (let i = 5; i < 20; i++) {
      await enrollParticipant(sessionIds[11], participantIds[i], 'confirmed');
    }

    // S13: 16 confirmados (participantes 20..35)
    for (let i = 20; i < 36; i++) {
      await enrollParticipant(sessionIds[12], participantIds[i], 'confirmed');
    }

    // S14: 42 confirmados (participantes 0..41)
    for (let i = 0; i < 42; i++) {
      await enrollParticipant(sessionIds[13], participantIds[i], 'confirmed');
    }

    await client.query('COMMIT');
    console.log('✅ Base de datos sembrada con éxito:');
    console.log(`   - 2 Organizadores: org1@eventovivo.edu, org2@eventovivo.edu (Pass: Admin123!)`);
    console.log(`   - 50 Participantes: participante1@universidad.edu .. participante50 (Pass: Pass123!)`);
    console.log(`   - 14 Sesiones realistas (cupos 20-60, talleres, hackatones, conferencias, encuentros)`);
    console.log(`   - Sesión 1 con lista de espera de 7 personas`);
    console.log(`   - Sesión 9 con 15 asistencias registradas y 10 encuestas completadas`);
    console.log(`   - Índices de alto rendimiento creados para consultas sin N+1`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error sembrando base de datos:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Ejecutar automáticamente si se corre como script
runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal seed error:', err);
    process.exit(1);
  });
