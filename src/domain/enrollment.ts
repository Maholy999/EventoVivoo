import { hasScheduleConflict, TimeSlot } from './schedule';
import { hasCapacity } from './capacity';

export type EnrollmentStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface EnrollmentResult {
  status: EnrollmentStatus;
  position?: number | null;
}

export type EnrollmentError =
  | 'DUPLICATE'
  | 'SCHEDULE_CONFLICT'
  | 'SESSION_NOT_PUBLISHED'
  | 'CAPACITY_EXCEEDED';

/**
 * R2, R3, R12: Valida las reglas de dominio para inscripción.
 * Lógica pura sin efectos secundarios ni dependencia de BD.
 */
export function validateEnrollment(opts: {
  sessionStatus: 'draft' | 'published' | 'cancelled';
  alreadyEnrolled: boolean;
  newSession: TimeSlot;
  confirmedSessions: TimeSlot[];
}): EnrollmentError | null {
  if (opts.sessionStatus !== 'published') return 'SESSION_NOT_PUBLISHED';
  if (opts.alreadyEnrolled) return 'DUPLICATE';
  if (hasScheduleConflict(opts.newSession, opts.confirmedSessions)) {
    return 'SCHEDULE_CONFLICT';
  }
  return null;
}

/**
 * R1, R4: Decide si inscribir como confirmado o en lista de espera (FIFO).
 */
export function decideEnrollmentStatus(
  capacity: number,
  confirmedCount: number
): EnrollmentStatus {
  return hasCapacity(capacity, confirmedCount) ? 'confirmed' : 'waitlisted';
}
