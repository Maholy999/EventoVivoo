import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer, assertSessionOwner } from '@/domain/rbac';
import { AuditRepository } from '@/repositories/AuditRepository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const { id: sessionId, enrollmentId } = await params;

    const sRes = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }
    const session = sRes.rows[0];

    // R14: Solo el dueño de la sesión puede rechazar
    assertSessionOwner(session.organizer_id, user.id);

    const enrRes = await pool.query(
      'SELECT * FROM enrollments WHERE id = $1 AND session_id = $2',
      [enrollmentId, sessionId]
    );
    if (enrRes.rows.length === 0) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }
    const enrollment = enrRes.rows[0];

    // Actualizar a cancelled
    await pool.query(
      "UPDATE enrollments SET status = 'cancelled', updated_at = now() WHERE id = $1",
      [enrollmentId]
    );

    // F14: Avisar al participante que fue rechazada su solicitud
    await pool.query(
      `INSERT INTO notifications (user_id, message, type, session_id)
       VALUES ($1, $2, 'session_cancelled', $3)`,
      [
        enrollment.user_id,
        `Tu solicitud de inscripción para la sesión "${session.title}" no fue aprobada por el organizador.`,
        sessionId,
      ]
    );

    // Auditoría
    const auditRepo = new AuditRepository(pool);
    await auditRepo.create({
      entity_type: 'enrollment',
      entity_id: enrollmentId,
      action: 'enrollment_rejected',
      changed_by: user.id,
      previous_value: { status: enrollment.status },
      new_value: { status: 'cancelled' },
    });

    return NextResponse.json({ message: 'Solicitud rechazada exitosamente.' });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: 'Error al rechazar solicitud' }, { status: 500 });
  }
}
