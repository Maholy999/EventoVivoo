import { TimeSlot, overlaps } from './schedule';

export interface AttendeeWithSchedule {
  userId: string;
  enrollmentId: string;
  otherConfirmedSlots: TimeSlot[];
}

export interface RescheduleConflictResult {
  hasConflict: boolean;
  affectedUserIds: string[];
}

/**
 * R8: Revalida choques de horario tras la reprogramación de una sesión.
 * Detecta qué participantes confirmados tienen conflicto con el nuevo horario.
 */
export function revalidateScheduleConflicts(
  newSlot: TimeSlot,
  attendees: AttendeeWithSchedule[]
): RescheduleConflictResult {
  const affectedUserIds: string[] = [];

  for (const attendee of attendees) {
    const conflicts = attendee.otherConfirmedSlots.some((slot) =>
      overlaps(newSlot, slot)
    );
    if (conflicts) {
      affectedUserIds.push(attendee.userId);
    }
  }

  return {
    hasConflict: affectedUserIds.length > 0,
    affectedUserIds,
  };
}
