import { NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';

export async function GET() {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    // Métricas por sesión: aforo, confirmados, en espera, asistentes, organizador, encuestas
    const sessionsRes = await pool.query(`
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
        COUNT(DISTINCT CASE WHEN e.status = 'confirmed' THEN e.id END)::int as confirmed_count,
        COUNT(DISTINCT CASE WHEN e.status = 'waitlisted' THEN e.id END)::int as waitlist_count,
        COUNT(DISTINCT CASE WHEN a.recorded_at IS NOT NULL THEN a.id END)::int as attended_count,
        COALESCE(ROUND(AVG(sv.rating), 2), 0)::float as survey_avg,
        COUNT(DISTINCT sv.id)::int as survey_count
      FROM sessions s
      JOIN users u_org ON u_org.id = s.organizer_id
      LEFT JOIN enrollments e ON e.session_id = s.id
      LEFT JOIN attendances a ON a.enrollment_id = e.id
      LEFT JOIN surveys sv ON sv.enrollment_id = e.id
      GROUP BY s.id, u_org.name
      ORDER BY s.starts_at ASC
    `);

    // Promedio de encuestas global
    const surveyStatsRes = await pool.query(`
      SELECT 
        COUNT(*)::int as total_surveys,
        COALESCE(ROUND(AVG(rating), 2), 0)::float as average_rating
      FROM surveys
    `);

    // Últimas respuestas de encuesta
    const recentSurveysRes = await pool.query(`
      SELECT 
        sv.id,
        sv.rating,
        sv.comment,
        sv.created_at,
        s.title as session_title,
        u.name as attendee_name
      FROM surveys sv
      JOIN enrollments e ON e.id = sv.enrollment_id
      JOIN sessions s ON s.id = e.session_id
      JOIN users u ON u.id = e.user_id
      ORDER BY sv.created_at DESC
      LIMIT 10
    `);

    const now = new Date();

    const sessions = sessionsRes.rows.map((row) => {
      const capacity = Number(row.capacity);
      const confirmed = Number(row.confirmed_count);
      const attended = Number(row.attended_count);
      const waitlist = Number(row.waitlist_count);
      const occupancyRate = capacity > 0 ? Math.round((confirmed / capacity) * 100) : 0;
      const attendanceRate = confirmed > 0 ? Math.round((attended / confirmed) * 100) : 0;
      const noShows = Math.max(0, confirmed - attended);

      const attentionReasons: string[] = [];
      if (row.status === 'published' && occupancyRate >= 90) {
        attentionReasons.push('Casi llena (≥90%)');
      }
      if (waitlist > 0) {
        attentionReasons.push(`Lista de espera activa (${waitlist} en cola)`);
      }
      if (row.status === 'draft') {
        attentionReasons.push('Borrador pendiente de publicación');
      }
      if (row.status === 'cancelled') {
        attentionReasons.push('Sesión cancelada');
      }
      if (row.status === 'published' && new Date(row.starts_at) < now && confirmed > 0 && attendanceRate < 50) {
        attentionReasons.push(`Baja asistencia (${attendanceRate}%)`);
      }

      return {
        ...row,
        capacity,
        confirmed_count: confirmed,
        waitlist_count: waitlist,
        attended_count: attended,
        no_shows: noShows,
        occupancy_rate: occupancyRate,
        attendance_rate: attendanceRate,
        is_owner: row.organizer_id === user.id,
        needs_attention: attentionReasons.length > 0,
        attention_reasons: attentionReasons,
      };
    });

    const attentionSessions = sessions.filter((s) => s.needs_attention);

    return NextResponse.json({
      currentUserId: user.id,
      sessions,
      attentionSessions,
      surveys: {
        total: Number(surveyStatsRes.rows[0].total_surveys),
        average_rating: Number(surveyStatsRes.rows[0].average_rating),
        recent: recentSurveysRes.rows,
      },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Error al cargar el panel de organizador' },
      { status: 500 }
    );
  }
}
