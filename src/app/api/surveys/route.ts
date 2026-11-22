import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { validateSurveySubmission } from '@/domain/survey';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    }

    // R13: Organizador no puede responder encuestas
    if (user.role === 'organizer') {
      return NextResponse.json(
        { error: 'Acceso denegado: los organizadores no pueden responder encuestas (R13)' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const enrollmentId = body.enrollmentId;
    const rating = Number(body.rating);
    const comment = body.comment ? String(body.comment).trim() : null;

    // Verificar enrollment y asistencia
    const enrRes = await pool.query(
      `SELECT e.id, e.user_id, a.recorded_at, sv.id as survey_id
       FROM enrollments e
       LEFT JOIN attendances a ON a.enrollment_id = e.id
       LEFT JOIN surveys sv ON sv.enrollment_id = e.id
       WHERE e.id = $1`,
      [enrollmentId]
    );

    if (enrRes.rows.length === 0) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }

    const row = enrRes.rows[0];
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const hasAttended = !!row.recorded_at;
    const alreadySubmitted = !!row.survey_id;

    const validationError = validateSurveySubmission({
      enrollmentId,
      hasAttended,
      alreadySubmitted,
      rating,
      comment,
    });

    if (validationError === 'NOT_ATTENDED') {
      return NextResponse.json(
        { error: 'Solo los participantes que hayan asistido pueden responder la encuesta' },
        { status: 403 }
      );
    }

    if (validationError === 'ALREADY_SUBMITTED') {
      return NextResponse.json(
        { error: 'Ya has respondido la encuesta para esta sesión' },
        { status: 400 }
      );
    }

    if (validationError === 'INVALID_RATING') {
      return NextResponse.json(
        { error: 'La calificación debe ser un número entero entre 1 y 5' },
        { status: 400 }
      );
    }

    await pool.query(
      'INSERT INTO surveys (enrollment_id, rating, comment) VALUES ($1, $2, $3)',
      [enrollmentId, rating, comment]
    );

    // F14: Avisar al organizador de la sesión
    try {
      const sOwnerRes = await pool.query(
        `SELECT s.id, s.title, s.organizer_id FROM sessions s
         JOIN enrollments e ON e.session_id = s.id
         WHERE e.id = $1`,
        [enrollmentId]
      );
      if (sOwnerRes.rows.length > 0) {
        const sRow = sOwnerRes.rows[0];
        await pool.query(
          `INSERT INTO notifications (user_id, message, type, session_id) VALUES ($1, $2, $3, $4)`,
          [
            sRow.organizer_id,
            `Nueva encuesta en "${sRow.title}": ⭐ ${rating}/5${comment ? ` ("${comment.slice(0, 35)}...")` : ''}`,
            'survey_received',
            sRow.id,
          ]
        );
      }
    } catch (notifErr) {
      console.error('Error enviando aviso F14 al organizador:', notifErr);
    }

    return NextResponse.json({
      message: '¡Gracias por compartir tu opinión! Encuesta guardada exitosamente.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar la encuesta' },
      { status: 500 }
    );
  }
}
