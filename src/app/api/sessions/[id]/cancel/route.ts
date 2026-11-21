import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { SessionRepository } from '@/repositories/SessionRepository';
import { EnrollmentRepository } from '@/repositories/EnrollmentRepository';
import { EnrollmentService } from '@/services/enrollmentService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para cancelar tu inscripción' },
        { status: 401 }
      );
    }

    const { id: sessionId } = await params;
    const sessionRepo = new SessionRepository(pool);
    const enrollmentRepo = new EnrollmentRepository(pool);
    const service = new EnrollmentService(pool, sessionRepo, enrollmentRepo);

    const result = await service.cancel(sessionId, user.id);

    if (!result.cancelled) {
      return NextResponse.json(
        { error: 'No se encontró una inscripción activa para cancelar' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Inscripción cancelada exitosamente.',
      promotedUserId: result.promotedUserId,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno al cancelar la inscripción' },
      { status: 500 }
    );
  }
}
