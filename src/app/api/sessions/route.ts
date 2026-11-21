import { NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Consultar sesiones publicadas con conteos de confirmados y lista de espera
    const res = await pool.query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.location,
        s.starts_at,
        s.ends_at,
        s.capacity,
        s.status,
        COALESCE(SUM(CASE WHEN e.status = 'confirmed' THEN 1 ELSE 0 END), 0)::int as confirmed_count,
        COALESCE(SUM(CASE WHEN e.status = 'waitlisted' THEN 1 ELSE 0 END), 0)::int as waitlist_count
      FROM sessions s
      LEFT JOIN enrollments e ON e.session_id = s.id
      WHERE s.status = 'published'
      GROUP BY s.id
      ORDER BY s.starts_at ASC
    `);

    // Consultar sesiones confirmadas del usuario actual para detectar choques y estado
    let userEnrollments: { sessionId: string; status: string; enrollmentId: string }[] = [];
    let userConfirmedSlots: { starts_at: Date; ends_at: Date; sessionId: string; title: string }[] = [];

    if (user) {
      const enrRes = await pool.query(
        `SELECT e.id, e.session_id, e.status, s.title, s.starts_at, s.ends_at
         FROM enrollments e
         JOIN sessions s ON s.id = e.session_id
         WHERE e.user_id = $1 AND e.status != 'cancelled'`,
        [user.id]
      );
      userEnrollments = enrRes.rows.map((r) => ({
        sessionId: r.session_id,
        status: r.status,
        enrollmentId: r.id,
      }));
      userConfirmedSlots = enrRes.rows
        .filter((r) => r.status === 'confirmed')
        .map((r) => ({
          sessionId: r.session_id,
          title: r.title,
          starts_at: new Date(r.starts_at),
          ends_at: new Date(r.ends_at),
        }));
    }

    const sessions = res.rows.map((s) => {
      const capacity = Number(s.capacity);
      const confirmed = Number(s.confirmed_count);
      const isFull = confirmed >= capacity;
      const isAlmostFull = !isFull && confirmed >= Math.floor(capacity * 0.8) && capacity > 1;

      let occupancyState: 'disponible' | 'casi_llena' | 'llena' = 'disponible';
      if (isFull) occupancyState = 'llena';
      else if (isAlmostFull) occupancyState = 'casi_llena';

      const userEnr = userEnrollments.find((e) => e.sessionId === s.id);
      const startsAt = new Date(s.starts_at);
      const endsAt = new Date(s.ends_at);

      // Choque de horario con otra sesión confirmada
      const conflictingSession = userConfirmedSlots.find(
        (slot) =>
          slot.sessionId !== s.id && startsAt < slot.ends_at && endsAt > slot.starts_at
      );

      return {
        id: s.id,
        title: s.title,
        description: s.description,
        location: s.location,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        capacity,
        confirmed_count: confirmed,
        waitlist_count: Number(s.waitlist_count),
        occupancy_state: occupancyState,
        user_status: userEnr ? userEnr.status : null,
        enrollment_id: userEnr ? userEnr.enrollmentId : null,
        has_conflict: !!conflictingSession,
        conflict_message: conflictingSession
          ? `Esta sesión se traslapa con "${conflictingSession.title}" (${new Date(conflictingSession.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${new Date(conflictingSession.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
          : null,
      };
    });

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: 'Error al obtener la agenda de sesiones' }, { status: 500 });
  }
}
