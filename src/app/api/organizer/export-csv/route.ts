import { NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';

export async function GET() {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const res = await pool.query(`
      SELECT 
        s.title as sesion,
        s.location as ubicacion,
        s.starts_at as horario_inicio,
        u.name as participante_nombre,
        u.email as participante_correo,
        e.status as estado_inscripcion,
        CASE WHEN a.recorded_at IS NOT NULL THEN 'SI' ELSE 'NO' END as asistio,
        a.recorded_at as fecha_asistencia
      FROM enrollments e
      JOIN sessions s ON s.id = e.session_id
      JOIN users u ON u.id = e.user_id
      LEFT JOIN attendances a ON a.enrollment_id = e.id
      ORDER BY s.title ASC, e.enrolled_at ASC
    `);

    // Formatear CSV
    const headers = [
      'Sesion',
      'Ubicacion',
      'Horario Inicio',
      'Participante',
      'Correo',
      'Estado',
      'Asistio',
      'Fecha Asistencia',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];

    for (const r of res.rows) {
      csvRows.push(
        [
          escapeCsv(r.sesion),
          escapeCsv(r.ubicacion),
          escapeCsv(r.horario_inicio ? new Date(r.horario_inicio).toISOString() : ''),
          escapeCsv(r.participante_nombre),
          escapeCsv(r.participante_correo),
          escapeCsv(r.estado_inscripcion),
          escapeCsv(r.asistio),
          escapeCsv(r.fecha_asistencia ? new Date(r.fecha_asistencia).toISOString() : ''),
        ].join(',')
      );
    }

    const csvContent = csvRows.join('\r\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="asistencia_eventovivo.csv"',
      },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al exportar CSV' }, { status: 500 });
  }
}
