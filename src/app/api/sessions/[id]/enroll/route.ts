import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { SessionRepository } from '@/repositories/SessionRepository';
import { EnrollmentRepository } from '@/repositories/EnrollmentRepository';
import { AttendanceRepository } from '@/repositories/AttendanceRepository';
import { EnrollmentService } from '@/services/enrollmentService';
import { generateQrToken } from '@/domain/qr';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para inscribirte en un evento' },
        { status: 401 }
      );
    }

    // R13: Organizador no puede inscribirse ni entrar en lista de espera
    if (user.role === 'organizer') {
      return NextResponse.json(
        { error: 'Acceso denegado: los organizadores no pueden inscribirse ni entrar en lista de espera (R13)' },
        { status: 403 }
      );
    }

    const { id: sessionId } = await params;
    const sessionRepo = new SessionRepository(pool);
    const enrollmentRepo = new EnrollmentRepository(pool);
    const attendanceRepo = new AttendanceRepository(pool);
    const enrollmentService = new EnrollmentService(pool, sessionRepo, enrollmentRepo);

    const result = await enrollmentService.enroll(sessionId, user.id);

    if (result.error) {
      const messages: Record<string, string> = {
        DUPLICATE: 'Ya estás inscrito en esta sesión.',
        SCHEDULE_CONFLICT: 'Esta sesión se traslapa con otra sesión ya confirmada en tu horario.',
        SESSION_NOT_PUBLISHED: 'Esta sesión no está disponible para inscripciones.',
        CAPACITY_EXCEEDED: 'El aforo se ha completado.',
      };
      return NextResponse.json(
        { error: messages[result.error] || 'No se pudo completar la inscripción.' },
        { status: 400 }
      );
    }

    const enrollment = result.enrollment!;

    // Si quedó confirmado, generar token QR seguro de 128 bits si no existe
    if (enrollment.status === 'confirmed') {
      const existingAttendance = await attendanceRepo.findByEnrollmentId(enrollment.id);
      if (!existingAttendance) {
        await attendanceRepo.create({
          enrollment_id: enrollment.id,
          qr_token: generateQrToken(),
        });
      }
    }

    return NextResponse.json({
      message:
        enrollment.status === 'confirmed'
          ? '¡Inscripción confirmada! Tu credencial de acceso ya está disponible.'
          : `Sesión completa. Quedaste registrado en la lista de espera (Posición #${enrollment.position}).`,
      enrollment,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno al procesar la inscripción' },
      { status: 500 }
    );
  }
}
