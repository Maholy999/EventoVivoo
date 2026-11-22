export type EnrollmentOutcome = 'confirmed' | 'waitlisted' | 'pending';

export interface ApprovalEvaluationInput {
  capacity: number;
  confirmedCount: number;
  hasScheduleConflict: boolean;
}

export type ApprovalOutcome =
  | { success: true; targetStatus: 'confirmed' | 'waitlisted'; promotedTo: 'confirmed' | 'waitlisted' }
  | { success: false; error: 'SCHEDULE_CONFLICT' };

/**
 * F13: Determina el estado inicial de una inscripción.
 * Si la sesión requiere aprobación del organizador, la inscripción queda "pending"
 * y NO consume cupo.
 */
export function determineEnrollmentStatus(
  requiresApproval: boolean,
  confirmedCount: number,
  capacity: number
): EnrollmentOutcome {
  if (requiresApproval) {
    return 'pending';
  }
  if (confirmedCount < capacity) {
    return 'confirmed';
  }
  return 'waitlisted';
}

/**
 * F13: Evalúa la aprobación por parte del organizador en la misma transacción R1.
 * - Si el participante tiene choque de horario, no se puede aprobar -> error.
 * - Si hay cupo disponible -> se aprueba como "confirmed".
 * - Si ya no hay cupo -> pasa a "waitlisted".
 */
export function evaluateApproval(input: ApprovalEvaluationInput): ApprovalOutcome {
  if (input.hasScheduleConflict) {
    return { success: false, error: 'SCHEDULE_CONFLICT' };
  }

  if (input.confirmedCount < input.capacity) {
    return {
      success: true,
      targetStatus: 'confirmed',
      promotedTo: 'confirmed',
    };
  }

  return {
    success: true,
    targetStatus: 'waitlisted',
    promotedTo: 'waitlisted',
  };
}
