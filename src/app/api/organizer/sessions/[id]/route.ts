import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer, assertSessionOwner } from '@/domain/rbac';
import { VALID_SESSION_TYPES, SessionType } from '@/domain/sessionValidation';
import { AuditRepository } from '@/repositories/AuditRepository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const { id: sessionId } = await params;

    // Obtener sesión
    const sRes = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }
    const session = sRes.rows[0];

    // Obtener lista de confirmados y asistencia
    const confirmedRes = await pool.query(
      `SELECT e.id as enrollment_id, e.user_id, u.name, u.email, e.enrolled_at,
              a.qr_token, a.recorded_at as attended_at
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN attendances a ON a.enrollment_id = e.id
       WHERE e.session_id = $1 AND e.status = 'confirmed'
       ORDER BY e.enrolled_at ASC`,
      [sessionId]
    );

    // Obtener lista de espera en orden estricto (FIFO)
    const waitlistRes = await pool.query(
      `SELECT e.id as enrollment_id, e.user_id, u.name, u.email, e.enrolled_at, e.position
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.session_id = $1 AND e.status = 'waitlisted'
       ORDER BY e.position ASC, e.enrolled_at ASC`,
      [sessionId]
    );

    // F13: Obtener lista de pendientes de aprobación
    const pendingRes = await pool.query(
      `SELECT e.id as enrollment_id, e.user_id, u.name, u.email, e.enrolled_at
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.session_id = $1 AND e.status = 'pending'
       ORDER BY e.enrolled_at ASC`,
      [sessionId]
    );

    // Obtener registro de cambios (auditoría R11)
    const auditRes = await pool.query(
      `SELECT a.id, a.action, a.previous_value, a.new_value, a.created_at, u.name as changed_by_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.changed_by
       WHERE a.entity_id = $1
       ORDER BY a.created_at DESC`,
      [sessionId]
    );

    // Obtener encuestas recibidas
    const surveysRes = await pool.query(
      `SELECT sv.id, sv.rating, sv.comment, sv.created_at, u.name as user_name
       FROM surveys sv
       JOIN enrollments e ON e.id = sv.enrollment_id
       JOIN users u ON u.id = e.user_id
       WHERE e.session_id = $1
       ORDER BY sv.created_at DESC`,
      [sessionId]
    );

    return NextResponse.json({
      session,
      confirmed: confirmedRes.rows,
      waitlist: waitlistRes.rows,
      pending: pendingRes.rows,
      auditLogs: auditRes.rows,
      surveys: surveysRes.rows,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: 'Error al consultar sesión' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const { id: sessionId } = await params;
    const body = await req.json();

    const sRes = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }
    const session = sRes.rows[0];

    // R14: Solo el dueño de la sesión puede editarla
    assertSessionOwner(session.organizer_id, user.id);

    const title = body.title !== undefined ? String(body.title).trim() : session.title;
    const description = body.description !== undefined ? (body.description ? String(body.description).trim() : null) : session.description;
    const location = body.location !== undefined ? (body.location ? String(body.location).trim() : null) : session.location;
    const type = body.type !== undefined ? body.type : session.type;

    if (body.type && !VALID_SESSION_TYPES.includes(type as SessionType)) {
      return NextResponse.json(
        { error: 'El tipo debe ser taller, hackatón, conferencia o encuentro.' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json({ error: 'El título no puede estar vacío.' }, { status: 400 });
    }

    const updateRes = await pool.query(
      `UPDATE sessions
       SET title = $1, description = $2, location = $3, type = $4, updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [title, description, location, type, sessionId]
    );

    const updated = updateRes.rows[0];

    // Bitácora de auditoría
    const auditRepo = new AuditRepository(pool);
    await auditRepo.create({
      entity_type: 'session',
      entity_id: sessionId,
      action: 'session_edited',
      changed_by: user.id,
      previous_value: { title: session.title, type: session.type, location: session.location },
      new_value: { title: updated.title, type: updated.type, location: updated.location },
    });

    return NextResponse.json({ session: updated });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: 'Error al actualizar sesión' }, { status: 500 });
  }
}
