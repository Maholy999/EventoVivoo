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
        s.type,
        s.description,
        s.location,
        s.starts_at,
        s.ends_at,
        s.capacity,
        s.status,
        s.organizer_id,
        u_org.name as organizer_name,
        COALESCE(SUM(CASE WHEN e.status = 'confirmed' THEN 1 ELSE 0 END), 0)::int as confirmed_count,
        COALESCE(SUM(CASE WHEN e.status = 'waitlisted' THEN 1 ELSE 0 END), 0)::int as waitlist_count
      FROM sessions s
      JOIN users u_org ON u_org.id = s.organizer_id
      LEFT JOIN enrollments e ON e.session_id = s.id
      WHERE s.status = 'published'
      GROUP BY s.id, u_org.name
      ORDER BY s.starts_at ASC
    `);

    // Consultar sesiones e inscripciones del usuario actual
    let userEnrollments: {
      sessionId: string;
      status: string;
      enrollmentId: string;
      hasAttended: boolean;
      surveySubmitted: boolean;
    }[] = [];
    let userConfirmedSlots: { starts_at: Date; ends_at: Date; sessionId: string; title: string }[] = [];

    if (user) {
      const enrRes = await pool.query(
        `SELECT e.id, e.session_id, e.status, s.title, s.starts_at, s.ends_at,
                (a.recorded_at IS NOT NULL) as has_attended,
                (sv.id IS NOT NULL) as survey_submitted
         FROM enrollments e
         JOIN sessions s ON s.id = e.session_id
         LEFT JOIN attendances a ON a.enrollment_id = e.id
         LEFT JOIN surveys sv ON sv.enrollment_id = e.id
         WHERE e.user_id = $1 AND e.status != 'cancelled'`,
        [user.id]
      );

      userEnrollments = enrRes.rows.map((r) => ({
        sessionId: r.session_id,
        status: r.status,
        enrollmentId: r.id,
        hasAttended: !!r.has_attended,
        surveySubmitted: !!r.survey_submitted,
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
      const isAlmostFull = !isFull && confirmed >= Math.floor(capacity * 0.9);

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
        type: s.type,
        description: s.description,
        location: s.location,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        capacity,
        confirmed_count: confirmed,
        free_slots: Math.max(0, capacity - confirmed),
        waitlist_count: Number(s.waitlist_count),
        occupancy_state: occupancyState,
        organizer_name: s.organizer_name,
        user_status: userEnr ? userEnr.status : null,
        enrollment_id: userEnr ? userEnr.enrollmentId : null,
        has_attended: userEnr ? userEnr.hasAttended : false,
        survey_submitted: userEnr ? userEnr.surveySubmitted : false,
        has_conflict: !!conflictingSession,
        conflict_message: conflictingSession
          ? `Se traslapa con "${conflictingSession.title}", ${new Date(conflictingSession.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}-${new Date(conflictingSession.ends_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
          : null,
      };
    });

    return NextResponse.json({
      currentUser: user ? { id: user.id, name: user.name, role: user.role } : null,
      sessions,
    });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    return NextResponse.json({ error: 'Error al obtener la agenda de sesiones' }, { status: 500 });
  }
}
