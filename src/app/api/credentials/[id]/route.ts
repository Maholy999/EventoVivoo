import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { generateQrSvg } from '@/lib/qrcode';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: enrollmentId } = await params;

    const res = await pool.query(
      `SELECT 
        e.id as enrollment_id,
        e.status as enrollment_status,
        e.position,
        e.enrolled_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        s.id as session_id,
        s.title as session_title,
        s.location as session_location,
        s.starts_at,
        s.ends_at,
        a.qr_token,
        a.recorded_at as attendance_recorded_at
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN sessions s ON s.id = e.session_id
      LEFT JOIN attendances a ON a.enrollment_id = e.id
      WHERE e.id = $1`,
      [enrollmentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Credencial no encontrada' }, { status: 404 });
    }

    const row = res.rows[0];

    // Solo el dueño de la credencial o un organizador pueden consultarla
    if (row.user_id !== user.id && user.role !== 'organizer') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    let qrSvg: string | null = null;
    if (row.qr_token) {
      qrSvg = generateQrSvg(row.qr_token, 220);
    }

    return NextResponse.json({
      credential: {
        enrollment_id: row.enrollment_id,
        status: row.enrollment_status,
        position: row.position,
        user_name: row.user_name,
        user_email: row.user_email,
        session_title: row.session_title,
        session_location: row.session_location || 'Auditorio Principal',
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        qr_token: row.qr_token,
        qr_svg: qrSvg,
        has_attended: !!row.attendance_recorded_at,
        attended_at: row.attendance_recorded_at,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al consultar la credencial' },
      { status: 500 }
    );
  }
}
