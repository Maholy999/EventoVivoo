import { NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';

export async function GET() {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    // Métricas por sesión: aforo, confirmados, en espera, asistentes
    const sessionsRes = await pool.query(`
      SELECT 
        s.id,
        s.title,
        s.location,
        s.starts_at,
        s.ends_at,
        s.capacity,
        s.status,
        COUNT(DISTINCT CASE WHEN e.status = 'confirmed' THEN e.id END)::int as confirmed_count,
        COUNT(DISTINCT CASE WHEN e.status = 'waitlisted' THEN e.id END)::int as waitlist_count,
        COUNT(DISTINCT CASE WHEN a.recorded_at IS NOT NULL THEN a.id END)::int as attended_count
      FROM sessions s
      LEFT JOIN enrollments e ON e.session_id = s.id
      LEFT JOIN attendances a ON a.enrollment_id = e.id
      GROUP BY s.id
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

    const sessions = sessionsRes.rows.map((row) => {
      const capacity = Number(row.capacity);
      const confirmed = Number(row.confirmed_count);
      const attended = Number(row.attended_count);
      const occupancyRate = capacity > 0 ? Math.round((confirmed / capacity) * 100) : 0;
      const attendanceRate = confirmed > 0 ? Math.round((attended / confirmed) * 100) : 0;

      return {
        ...row,
        capacity,
        confirmed_count: confirmed,
        waitlist_count: Number(row.waitlist_count),
        attended_count: attended,
        occupancy_rate: occupancyRate,
        attendance_rate: attendanceRate,
      };
    });

    return NextResponse.json({
      sessions,
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
