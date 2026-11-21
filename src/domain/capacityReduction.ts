export interface ConfirmedAttendee {
  id: string;
  userId: string;
  enrolledAt: Date;
}

export interface ExistingWaitlisted {
  id: string;
  userId: string;
  position: number;
}

export interface CapacityReductionPlan {
  keptConfirmedIds: string[];
  demotedToWaitlist: {
    id: string;
    userId: string;
    newPosition: number;
  }[];
  shiftedWaitlist: {
    id: string;
    newPosition: number;
  }[];
}

/**
 * R7: Política de reducción de aforo.
 * - No se permite aforo menor que las asistencias ya registradas.
 * - Si nuevo aforo < confirmados: los ÚLTIMOS inscritos (LIFO por enrolledAt)
 *   pasan al INICIO de la lista de espera, conservando su orden relativo.
 * - Los que ya estaban en lista de espera se desplazan para mantener orden FIFO.
 */
export function calculateCapacityReduction(
  newCapacity: number,
  confirmedAttendees: ConfirmedAttendee[],
  existingWaitlist: ExistingWaitlisted[],
  recordedAttendanceCount: number
): { plan?: CapacityReductionPlan; error?: 'CAPACITY_BELOW_ATTENDANCE' | 'INVALID_CAPACITY' } {
  if (!Number.isInteger(newCapacity) || newCapacity < 0) {
    return { error: 'INVALID_CAPACITY' };
  }

  if (newCapacity < recordedAttendanceCount) {
    return { error: 'CAPACITY_BELOW_ATTENDANCE' };
  }

  // Ordenar confirmados cronológicamente: los primeros inscritos van primero
  const sortedConfirmed = [...confirmedAttendees].sort(
    (a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime()
  );

  if (sortedConfirmed.length <= newCapacity) {
    // No hay necesidad de degradar a nadie
    return {
      plan: {
        keptConfirmedIds: sortedConfirmed.map((c) => c.id),
        demotedToWaitlist: [],
        shiftedWaitlist: existingWaitlist.map((w) => ({
          id: w.id,
          newPosition: w.position,
        })),
      },
    };
  }

  // Los primeros `newCapacity` se quedan confirmados
  const kept = sortedConfirmed.slice(0, newCapacity);
  // Los excedentes (los últimos) se degradan a la cabecera de la lista de espera
  const demoted = sortedConfirmed.slice(newCapacity);

  // A los degradados se les asigna posiciones 1, 2, ..., N manteniendo su orden relativo
  const demotedWithPositions = demoted.map((d, index) => ({
    id: d.id,
    userId: d.userId,
    newPosition: index + 1,
  }));

  const shiftOffset = demoted.length;
  // La lista de espera existente se desplaza sumando shiftOffset a su posición
  const shiftedExisting = [...existingWaitlist]
    .sort((a, b) => a.position - b.position)
    .map((w) => ({
      id: w.id,
      newPosition: w.position + shiftOffset,
    }));

  return {
    plan: {
      keptConfirmedIds: kept.map((c) => c.id),
      demotedToWaitlist: demotedWithPositions,
      shiftedWaitlist: shiftedExisting,
    },
  };
}
