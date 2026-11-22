import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    let query = `
      SELECT 
        s.title as sesion,
        s.type as tipo,
        s.location as ubicacion,
        s.starts_at as horario_inicio,
        u.name as participante_nombre,
        u.email as participante_correo,
        e.status as estado_inscripcion,
        e.position as puesto_espera,
        CASE WHEN a.recorded_at IS NOT NULL THEN 'SI' ELSE 'NO' END as asistio,
        a.recorded_at as fecha_asistencia,
        a.qr_token
      FROM enrollments e
      JOIN sessions s ON s.id = e.session_id
      JOIN users u ON u.id = e.user_id
      LEFT JOIN attendances a ON a.enrollment_id = e.id
    `;

    const params: unknown[] = [];
    if (sessionId) {
      query += ` WHERE s.id = $1`;
      params.push(sessionId);
    }

    query += ` ORDER BY s.title ASC, e.status ASC, e.position ASC NULLS LAST, e.enrolled_at ASC`;

    const res = await pool.query(query, params);

    // Formatear CSV
    const headers = [
      'Sesion',
      'Tipo',
      'Ubicacion',
      'Horario Inicio',
      'Participante',
      'Correo',
      'Estado Inscripcion',
      'Puesto Espera',
      'Asistio',
      'Fecha Asistencia',
      'Token Credencial',
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
          escapeCsv(r.tipo),
          escapeCsv(r.ubicacion),
          escapeCsv(r.horario_inicio ? new Date(r.horario_inicio).toISOString() : ''),
          escapeCsv(r.participante_nombre),
          escapeCsv(r.participante_correo),
          escapeCsv(r.estado_inscripcion),
          escapeCsv(r.puesto_espera ?? ''),
          escapeCsv(r.asistio),
          escapeCsv(r.fecha_asistencia ? new Date(r.fecha_asistencia).toISOString() : ''),
          escapeCsv(r.qr_token ?? ''),
        ].join(',')
      );
    }

    const csvContent = csvRows.join('\r\n');
    const filename = sessionId ? `asistencia_sesion_${sessionId.slice(0, 8)}.csv` : 'asistencia_eventovivo.csv';

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Error al exportar reporte de asistencia' },
      { status: 500 }
    );
  }
}
