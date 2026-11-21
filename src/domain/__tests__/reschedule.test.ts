import { describe, it, expect } from 'vitest';
import { revalidateScheduleConflicts } from '../reschedule';

describe('R8 - Reprogramación y revalidación de choques', () => {
  const slot = (startH: number, endH: number) => ({
    starts_at: new Date(`2026-01-01T${String(startH).padStart(2, '0')}:00:00Z`),
    ends_at: new Date(`2026-01-01T${String(endH).padStart(2, '0')}:00:00Z`),
  });

  it('detecta participantes con conflicto al cambiar el horario', () => {
    const attendees = [
      {
        userId: 'u1',
        enrollmentId: 'e1',
        otherConfirmedSlots: [slot(14, 16)], // Chocará con 15:00-17:00
      },
      {
        userId: 'u2',
        enrollmentId: 'e2',
        otherConfirmedSlots: [slot(10, 12)], // No chocará con 15:00-17:00
      },
      {
        userId: 'u3',
        enrollmentId: 'e3',
        otherConfirmedSlots: [], // Sin otras sesiones
      },
    ];

    const result = revalidateScheduleConflicts(slot(15, 17), attendees);

    expect(result.hasConflict).toBe(true);
    expect(result.affectedUserIds).toEqual(['u1']);
  });

  it('retorna hasConflict=false cuando ningún participante tiene choques', () => {
    const attendees = [
      {
        userId: 'u1',
        enrollmentId: 'e1',
        otherConfirmedSlots: [slot(8, 10)],
      },
      {
        userId: 'u2',
        enrollmentId: 'e2',
        otherConfirmedSlots: [slot(17, 19)],
      },
    ];

    const result = revalidateScheduleConflicts(slot(10, 12), attendees);

    expect(result.hasConflict).toBe(false);
    expect(result.affectedUserIds).toHaveLength(0);
  });
});
