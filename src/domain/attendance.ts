export type AttendanceResult =
  | { kind: 'recorded'; recordedAt: Date }
  | { kind: 'already_registered'; originalRecordedAt: Date }
  | { kind: 'not_confirmed' };

/**
 * R6: Lógica de asistencia idempotente.
 * - Solo inscritos confirmados pueden registrar asistencia.
 * - Si ya tiene registro previo, devuelve 'already_registered' con la hora original.
 * - Si es la primera vez, registra la asistencia.
 */
export function evaluateAttendance(
  isConfirmed: boolean,
  existingAttendance: { recordedAt: Date } | null
): AttendanceResult {
  if (!isConfirmed) return { kind: 'not_confirmed' };
  if (existingAttendance) {
    return {
      kind: 'already_registered',
      originalRecordedAt: existingAttendance.recordedAt,
    };
  }
  return { kind: 'recorded', recordedAt: new Date() };
}
