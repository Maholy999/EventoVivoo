import { TimeSlot, overlaps } from './schedule';

export interface WaitlistEntry {
  id: string;
  userId: string;
  position: number;
  sessionSlot: TimeSlot;
  confirmedSlots: TimeSlot[];
}

/**
 * R5: Encuentra el primer candidato en la lista de espera (orden FIFO por posición)
 * que NO tenga choque de horario con sus otras sesiones confirmadas.
 * Los participantes con choque se SALTAN pero CONSERVAN su posición.
 * Retorna el userId del candidato elegible o null si ninguno lo es.
 */
export function findPromotionCandidate(
  waitlist: WaitlistEntry[],
  cancelledSlot: TimeSlot
): string | null {
  const sorted = [...waitlist].sort((a, b) => a.position - b.position);

  for (const entry of sorted) {
    // Excluir de sus confirmadas la sesión que se canceló
    const otherConfirmed = entry.confirmedSlots.filter(
      (s) =>
        !(
          s.starts_at.getTime() === cancelledSlot.starts_at.getTime() &&
          s.ends_at.getTime() === cancelledSlot.ends_at.getTime()
        )
    );

    if (!otherConfirmed.some((s) => overlaps(s, entry.sessionSlot))) {
      return entry.userId;
    }
  }
  return null;
}
