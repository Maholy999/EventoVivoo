import { describe, it, expect } from 'vitest';
import { calculateCapacityReduction } from '../capacityReduction';

describe('R7 - Reducción de aforo y degradación a lista de espera', () => {
  const d = (min: number) => new Date(`2026-01-01T10:${String(min).padStart(2, '0')}:00Z`);

  it('no degrada a nadie si el nuevo aforo cubre a los confirmados actuales', () => {
    const attendees = [
      { id: 'att-1', userId: 'u1', enrolledAt: d(10) },
      { id: 'att-2', userId: 'u2', enrolledAt: d(20) },
    ];
    const waitlist = [{ id: 'w-1', userId: 'w1', position: 1 }];

    const { plan, error } = calculateCapacityReduction(5, attendees, waitlist, 0);

    expect(error).toBeUndefined();
    expect(plan?.keptConfirmedIds).toEqual(['att-1', 'att-2']);
    expect(plan?.demotedToWaitlist).toHaveLength(0);
    expect(plan?.shiftedWaitlist[0].newPosition).toBe(1);
  });

  it('rechaza reducción si el aforo es menor que las asistencias ya registradas', () => {
    const attendees = [
      { id: 'att-1', userId: 'u1', enrolledAt: d(10) },
      { id: 'att-2', userId: 'u2', enrolledAt: d(20) },
      { id: 'att-3', userId: 'u3', enrolledAt: d(30) },
    ];

    const { error } = calculateCapacityReduction(1, attendees, [], 2);
    expect(error).toBe('CAPACITY_BELOW_ATTENDANCE');
  });

  it('rechaza aforo negativo o no entero', () => {
    expect(calculateCapacityReduction(-1, [], [], 0).error).toBe('INVALID_CAPACITY');
    expect(calculateCapacityReduction(2.5, [], [], 0).error).toBe('INVALID_CAPACITY');
  });

  it('degrada los últimos inscritos (LIFO) a la cabecera de la lista de espera conservando orden relativo', () => {
    // 4 confirmados: u1 (10:00), u2 (10:15), u3 (10:30), u4 (10:45)
    const attendees = [
      { id: 'att-3', userId: 'u3', enrolledAt: d(30) },
      { id: 'att-1', userId: 'u1', enrolledAt: d(0) },
      { id: 'att-4', userId: 'u4', enrolledAt: d(45) },
      { id: 'att-2', userId: 'u2', enrolledAt: d(15) },
    ];

    // Lista de espera existente con 2 personas
    const existingWaitlist = [
      { id: 'w-1', userId: 'uw1', position: 1 },
      { id: 'w-2', userId: 'uw2', position: 2 },
    ];

    // Reducir aforo de 4 a 2
    const { plan, error } = calculateCapacityReduction(2, attendees, existingWaitlist, 0);

    expect(error).toBeUndefined();
    // Se quedan los más antiguos: u1 y u2
    expect(plan?.keptConfirmedIds).toEqual(['att-1', 'att-2']);

    // Se degradan u3 y u4 a posiciones 1 y 2
    expect(plan?.demotedToWaitlist).toEqual([
      { id: 'att-3', userId: 'u3', newPosition: 1 },
      { id: 'att-4', userId: 'u4', newPosition: 2 },
    ]);

    // La lista de espera anterior se desplaza a posiciones 3 y 4
    expect(plan?.shiftedWaitlist).toEqual([
      { id: 'w-1', newPosition: 3 },
      { id: 'w-2', newPosition: 4 },
    ]);
  });
});
