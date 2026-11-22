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

    if (!body.starts_at || !body.ends_at) {
      return NextResponse.json(
        { error: 'Fecha y hora de inicio y fin son obligatorias.' },
        { status: 400 }
      );
    }

    const startsAt = new Date(body.starts_at);
    const endsAt = new Date(body.ends_at);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: 'Horario inválido' }, { status: 400 });
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      return NextResponse.json(
        { error: 'La hora de fin debe ser posterior a la hora de inicio.' },
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

    const result = await service.rescheduleSession({
      sessionId,
      newSlot: { starts_at: startsAt, ends_at: endsAt },
      newLocation: body.location ? String(body.location).trim() : undefined,
      changedBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo reprogramar la sesión' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Sesión reprogramada exitosamente.',
      affectedUserIds: result.affectedUserIds,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: 'Error interno al reprogramar sesión' }, { status: 500 });
  }
}
