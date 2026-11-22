import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer, assertSessionOwner } from '@/domain/rbac';
import { hasScheduleConflict } from '@/domain/schedule';
import { generateQrToken } from '@/domain/qr';
import { AuditRepository } from '@/repositories/AuditRepository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const client = await pool.connect();
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const { id: sessionId, enrollmentId } = await params;

    await client.query('BEGIN');

    // 1. Obtener sesión bloqueada con FOR UPDATE (R1)
    const sRes = await client.query('SELECT * FROM sessions WHERE id = $1 FOR UPDATE', [sessionId]);
    if (sRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }
    const session = sRes.rows[0];

    // R14: Solo el dueño de la sesión puede gestionar aprobaciones
    assertSessionOwner(session.organizer_id, user.id);

    // 2. Obtener la inscripción pendiente
    const enrRes = await client.query(
      'SELECT * FROM enrollments WHERE id = $1 AND session_id = $2 FOR UPDATE',
      [enrollmentId, sessionId]
    );
    if (enrRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }
    const enrollment = enrRes.rows[0];

    if (enrollment.status !== 'pending') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `La inscripción no está pendiente (estado actual: ${enrollment.status})` },
        { status: 400 }
      );
    }

    // 3. Validar choques de horario con otras sesiones confirmadas del participante (R2)
    const otherConfRes = await client.query(
      `SELECT s.id, s.title, s.starts_at, s.ends_at
       FROM enrollments e
       JOIN sessions s ON s.id = e.session_id
       WHERE e.user_id = $1 AND e.status = 'confirmed' AND s.id != $2`,
      [enrollment.user_id, sessionId]
    );

    const targetSlot = { starts_at: new Date(session.starts_at), ends_at: new Date(session.ends_at) };
    const existingSlots = otherConfRes.rows.map((s) => ({
      title: s.title,
      starts_at: new Date(s.starts_at),
      ends_at: new Date(s.ends_at),
    }));

    const conflict = existingSlots.find((s) =>
      hasScheduleConflict(targetSlot, [{ starts_at: s.starts_at, ends_at: s.ends_at }])
    );

    if (conflict) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          error: `No se puede aprobar: el participante tiene un choque de horario con "${conflict.title}".`,
        },
        { status: 400 }
      );
    }

    // 4. Validar cupo disponible
    const confCountRes = await client.query(
      "SELECT COUNT(*)::int as count FROM enrollments WHERE session_id = $1 AND status = 'confirmed'",
      [sessionId]
    );
    const confirmedCount = confCountRes.rows[0].count;

    let targetStatus = 'confirmed';
    let assignedPosition: number | null = null;

    if (confirmedCount < session.capacity) {
      // Cupo disponible -> Confirmar y generar token QR
      targetStatus = 'confirmed';
      await client.query(
        "UPDATE enrollments SET status = 'confirmed', updated_at = now() WHERE id = $1",
        [enrollmentId]
      );

      const qrToken = generateQrToken();
      await client.query(
        'INSERT INTO attendances (enrollment_id, qr_token) VALUES ($1, $2)',
        [enrollmentId, qrToken]
      );

      // Notificar al participante (F14)
      await client.query(
        `INSERT INTO notifications (user_id, message, type, session_id)
         VALUES ($1, $2, 'promotion', $3)`,
        [
          enrollment.user_id,
          `¡Tu inscripción en "${session.title}" ha sido aprobada y confirmada! Tu credencial de acceso ya está disponible.`,
          sessionId,
        ]
      );
    } else {
      // Sin cupo -> Pasa a lista de espera
      targetStatus = 'waitlisted';
      const maxPosRes = await client.query(
        "SELECT COALESCE(MAX(position), 0)::int as max_pos FROM enrollments WHERE session_id = $1 AND status = 'waitlisted'",
        [sessionId]
      );
      assignedPosition = maxPosRes.rows[0].max_pos + 1;

      await client.query(
        "UPDATE enrollments SET status = 'waitlisted', position = $1, updated_at = now() WHERE id = $2",
        [assignedPosition, enrollmentId]
      );

      // Notificar al participante
      await client.query(
        `INSERT INTO notifications (user_id, message, type, session_id)
         VALUES ($1, $2, 'waitlisted', $3)`,
        [
          enrollment.user_id,
          `Tu solicitud para "${session.title}" fue aprobada, pero el aforo ya se completó. Quedaste en lista de espera (Puesto #${assignedPosition}).`,
          sessionId,
        ]
      );
    }

    // Bitácora de auditoría (R11)
    const auditRepo = new AuditRepository(pool);
    await auditRepo.create(
      {
        entity_type: 'enrollment',
        entity_id: enrollmentId,
        action: 'enrollment_approved',
        changed_by: user.id,
        previous_value: { status: 'pending' },
        new_value: { status: targetStatus, position: assignedPosition },
      },
      client
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message:
        targetStatus === 'confirmed'
          ? 'Inscripción aprobada y confirmada exitosamente.'
          : `Inscripción aprobada: aforo lleno, pasó a lista de espera (Puesto #${assignedPosition}).`,
      status: targetStatus,
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    console.error('Error approving enrollment:', err);
    return NextResponse.json({ error: 'Error al procesar la aprobación' }, { status: 500 });
  } finally {
    client.release();
  }
}
