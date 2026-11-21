import { Pool } from 'pg';
import { IAttendanceRepository } from '@/repositories/IAttendanceRepository';
import { evaluateAttendance, AttendanceResult } from '@/domain/attendance';
import { DbEnrollment } from '@/repositories/types';

export class AttendanceService {
  constructor(
    private pool: Pool,
    private attendanceRepo: IAttendanceRepository
  ) {}

  /**
   * Caso de uso: Registrar asistencia vía QR Token de forma idempotente (R6, R9)
   */
  async registerAttendance(
    qrToken: string,
    enrollment: DbEnrollment
  ): Promise<AttendanceResult> {
    const isConfirmed = enrollment.status === 'confirmed';
    const existing = await this.attendanceRepo.findByQrToken(qrToken);

    const evaluation = evaluateAttendance(
      isConfirmed,
      existing ? { recordedAt: existing.recorded_at } : null
    );

    if (evaluation.kind === 'recorded') {
      await this.attendanceRepo.create({
        enrollment_id: enrollment.id,
        qr_token: qrToken,
      });
    }

    return evaluation;
  }
}
