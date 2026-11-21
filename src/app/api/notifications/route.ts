import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const res = await pool.query(
      `SELECT n.id, n.message, n.type, n.read, n.created_at, s.title as session_title
       FROM notifications n
       LEFT JOIN sessions s ON s.id = n.session_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ notifications: res.rows });
  } catch {
    return NextResponse.json({ error: 'Error al consultar avisos' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const notificationId = body.id;

    if (notificationId) {
      await pool.query(
        'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
        [notificationId, user.id]
      );
    } else {
      // Marcar todas como leídas
      await pool.query(
        'UPDATE notifications SET read = true WHERE user_id = $1',
        [user.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar aviso' }, { status: 500 });
  }
}
