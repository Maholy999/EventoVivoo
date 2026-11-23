export interface TimeSlot {
  starts_at: Date;
  ends_at: Date;
}

/**
 * R2: Determina si dos franjas horarias se solapan.
 * Criterio: inicio_A < fin_B AND fin_A > inicio_B
 * Sesiones consecutivas (fin_A === inicio_B o fin_B === inicio_A) NO chocan.
 */
export function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.starts_at <= b.ends_at && a.ends_at >= b.starts_at;
}

/**
 * Verifica si una nueva sesión choca con alguna de las sesiones existentes confirmadas.
 */
export function hasScheduleConflict(
  newSession: TimeSlot,
  existingSessions: TimeSlot[]
): boolean {
  return existingSessions.some((s) => overlaps(newSession, s));
}
