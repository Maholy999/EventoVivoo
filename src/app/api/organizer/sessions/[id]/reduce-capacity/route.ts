import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';
import { SessionRepository } from '@/repositories/SessionRepository';
import { EnrollmentRepository } from '@/repositories/EnrollmentRepository';
import { AuditRepository } from '@/repositories/AuditRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { SessionManagementService } from '@/services/sessionManagementService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const { id: sessionId } = await params;
    const body = await req.json();
    const newCapacity = Number(body.newCapacity);

    if (isNaN(newCapacity) || newCapacity < 1) {
      return NextResponse.json(
        { error: 'El aforo debe ser un número entero mayor o igual a 1.' },
        { status: 400 }
      );
    }

    const sessionRepo = new SessionRepository(pool);
    const enrollmentRepo = new EnrollmentRepository(pool);
    const auditRepo = new AuditRepository(pool);
    const notificationRepo = new NotificationRepository(pool);
    const service = new SessionManagementService(
      pool,
      sessionRepo,
      enrollmentRepo,
      auditRepo,
      notificationRepo
    );

    const result = await service.reduceCapacity({
      sessionId,
      newCapacity,
      changedBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo reducir el aforo' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Aforo actualizado exitosamente.',
      demotedCount: result.demotedCount,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: 'Error interno al reducir aforo' }, { status: 500 });
  }
}
