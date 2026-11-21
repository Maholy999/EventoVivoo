import { Pool } from 'pg';
import { ISessionRepository } from '@/repositories/ISessionRepository';
import { IEnrollmentRepository } from '@/repositories/IEnrollmentRepository';
import { validateEnrollment, decideEnrollmentStatus, EnrollmentError } from '@/domain/enrollment';
import { findPromotionCandidate } from '@/domain/waitlist';
import { DbEnrollment } from '@/repositories/types';

export class EnrollmentService {
  constructor(
    private pool: Pool,
    private sessionRepo: ISessionRepository,
    private enrollmentRepo: IEnrollmentRepository
  ) {}

  /**
   * Caso de uso: Inscripción con bloqueo transaccional (R1, R2, R3, R4)
   */
  async enroll(sessionId: string, userId: string): Promise<{
    enrollment?: DbEnrollment;
    error?: EnrollmentError;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const session = await this.sessionRepo.findByIdForUpdate(sessionId, client);
      if (!session) {
        await client.query('ROLLBACK');
        return { error: 'SESSION_NOT_PUBLISHED' };
      }

      const existingEnrollment = await this.enrollmentRepo.findBySessionAndUser(sessionId, userId);
      const isAlreadyEnrolled = !!(existingEnrollment && existingEnrollment.status !== 'cancelled');

      const confirmedSessions = await this.enrollmentRepo.findConfirmedSessionsForUser(userId);

      const validationError = validateEnrollment({
        sessionStatus: session.status,
        alreadyEnrolled: isAlreadyEnrolled,
        newSession: { starts_at: session.starts_at, ends_at: session.ends_at },
        confirmedSessions: confirmedSessions.map(s => ({ starts_at: s.starts_at, ends_at: s.ends_at })),
      });

      if (validationError) {
        await client.query('ROLLBACK');
        return { error: validationError };
      }

      const confirmedCount = await this.enrollmentRepo.findConfirmedCountForSession(sessionId, client);
      const status = decideEnrollmentStatus(session.capacity, confirmedCount);

      let position: number | null = null;
      if (status === 'waitlisted') {
        position = await this.enrollmentRepo.getNextWaitlistPosition(sessionId, client);
      }

      let enrollment: DbEnrollment;
      if (existingEnrollment) {
        enrollment = await this.enrollmentRepo.updateEnrollmentStatus(
          existingEnrollment.id,
          status,
          position,
          client
        );
      } else {
        enrollment = await this.enrollmentRepo.createEnrollment(
          {
            session_id: sessionId,
            user_id: userId,
            status,
            position,
          },
          client
        );
      }

      await client.query('COMMIT');
      return { enrollment };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Caso de uso: Cancelación de inscripción con promoción atómica FIFO (R5)
   */
  async cancel(sessionId: string, userId: string): Promise<{
    cancelled: boolean;
    promotedUserId: string | null;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const session = await this.sessionRepo.findByIdForUpdate(sessionId, client);
      if (!session) {
        await client.query('ROLLBACK');
        return { cancelled: false, promotedUserId: null };
      }

      const enrollment = await this.enrollmentRepo.findBySessionAndUser(sessionId, userId);
      if (!enrollment || enrollment.status === 'cancelled') {
        await client.query('ROLLBACK');
        return { cancelled: false, promotedUserId: null };
      }

      const wasConfirmed = enrollment.status === 'confirmed';

      await this.enrollmentRepo.updateEnrollmentStatus(enrollment.id, 'cancelled', null, client);

      let promotedUserId: string | null = null;

      if (wasConfirmed) {
        const waitlistRaw = await this.enrollmentRepo.findWaitlistForSession(sessionId, client);
        const waitlistEntries = waitlistRaw.map(w => ({
          id: w.id,
          userId: w.user_id,
          position: w.position || 0,
          sessionSlot: { starts_at: session.starts_at, ends_at: session.ends_at },
          confirmedSlots: w.confirmedSessions.map(s => ({ starts_at: s.starts_at, ends_at: s.ends_at })),
        }));

        promotedUserId = findPromotionCandidate(
          waitlistEntries,
          { starts_at: session.starts_at, ends_at: session.ends_at }
        );

        if (promotedUserId) {
          const toPromote = waitlistRaw.find(w => w.user_id === promotedUserId);
          if (toPromote) {
            await this.enrollmentRepo.updateEnrollmentStatus(toPromote.id, 'confirmed', null, client);
          }
        }
      }

      await client.query('COMMIT');
      return { cancelled: true, promotedUserId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
