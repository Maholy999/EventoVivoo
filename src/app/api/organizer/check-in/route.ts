import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';
import { evaluateAttendance } from '@/domain/attendance';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const body = await req.json();
    const token = (body.token || '').trim();

    if (!token) {
      return NextResponse.json(
        { error: 'Código o token de credencial obligatorio' },
        { status: 400 }
      );
    }

    // Buscar credencial por qr_token
    const attRes = await pool.query(
      `SELECT a.id, a.enrollment_id, a.qr_token, a.recorded_at,
              e.status as enrollment_status, e.user_id,
              u.name as user_name, u.email as user_email,
              s.title as session_title
       FROM attendances a
       JOIN enrollments e ON e.id = a.enrollment_id
       JOIN users u ON u.id = e.user_id
       JOIN sessions s ON s.id = e.session_id
       WHERE a.qr_token = $1`,
      [token]
    );

    if (attRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Credencial inválida o código no encontrado' },
        { status: 404 }
      );
    }

    const row = attRes.rows[0];
    const isConfirmed = row.enrollment_status === 'confirmed';
    const existing = row.recorded_at ? { recordedAt: new Date(row.recorded_at) } : null;

    const evaluation = evaluateAttendance(isConfirmed, existing);

    if (evaluation.kind === 'not_confirmed') {
      return NextResponse.json(
        { error: 'Acceso denegado: El participante no tiene estado confirmado' },
        { status: 403 }
      );
    }

    if (evaluation.kind === 'already_registered') {
      return NextResponse.json({
        status: 'already_registered',
        message: 'Acceso ya registrado previamente',
        original_recorded_at: evaluation.originalRecordedAt,
        attendee: {
          name: row.user_name,
          email: row.user_email,
          session: row.session_title,
        },
      });
    }

    // Registrar hora de asistencia por primera vez
    const now = new Date();
    await pool.query(
      'UPDATE attendances SET recorded_at = $1 WHERE id = $2',
      [now, row.id]
    );

    return NextResponse.json({
      status: 'recorded',
      message: '¡Asistencia registrada con éxito!',
      recorded_at: now,
      attendee: {
        name: row.user_name,
        email: row.user_email,
        session: row.session_title,
      },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Error al registrar asistencia' },
      { status: 500 }
    );
  }
}
