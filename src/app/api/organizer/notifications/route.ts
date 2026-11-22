import { NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';

export async function GET() {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    // Obtener notificaciones para el organizador
    const res = await pool.query(
      `SELECT n.id, n.message, n.type, n.read, n.created_at, n.session_id, s.title as session_title
       FROM notifications n
       LEFT JOIN sessions s ON s.id = n.session_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [user.id]
    );

    return NextResponse.json({ notifications: res.rows });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: 'Error al obtener avisos' }, { status: 500 });
  }
}
