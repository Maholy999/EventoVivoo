import { describe, it, expect } from 'vitest';
import { findPromotionCandidate } from '../waitlist';

const slot = (startH: number, endH: number) => ({
  starts_at: new Date(`2026-01-01T${String(startH).padStart(2, '0')}:00:00Z`),
  ends_at: new Date(`2026-01-01T${String(endH).padStart(2, '0')}:00:00Z`),
});

const targetSlot = slot(12, 14);

describe('R4, R5 - Lista de espera y promoción', () => {
  it('R5: promueve al primero sin choque', () => {
    const waitlist = [
      { id: 'e1', userId: 'u1', position: 1, sessionSlot: targetSlot, confirmedSlots: [] },
      { id: 'e2', userId: 'u2', position: 2, sessionSlot: targetSlot, confirmedSlots: [] },
    ];
    expect(findPromotionCandidate(waitlist, slot(10, 12))).toBe('u1');
  });

  it('R5: salta al primero con choque y promueve al siguiente que no lo tiene', () => {
    // u1 tiene conflicto con 13-15 (se traslapa con target 12-14)
    const waitlist = [
      { id: 'e1', userId: 'u1', position: 1, sessionSlot: targetSlot, confirmedSlots: [slot(13, 15)] },
      { id: 'e2', userId: 'u2', position: 2, sessionSlot: targetSlot, confirmedSlots: [] },
    ];
    expect(findPromotionCandidate(waitlist, slot(10, 12))).toBe('u2');
  });

  it('R5: retorna null si todos los participantes en espera tienen choque', () => {
    const waitlist = [
      { id: 'e1', userId: 'u1', position: 1, sessionSlot: targetSlot, confirmedSlots: [slot(13, 15)] },
      { id: 'e2', userId: 'u2', position: 2, sessionSlot: targetSlot, confirmedSlots: [slot(11, 13)] },
    ];
    expect(findPromotionCandidate(waitlist, slot(10, 12))).toBeNull();
  });

  it('R4: retorna null con lista vacía', () => {
    expect(findPromotionCandidate([], slot(10, 12))).toBeNull();
  });

  it('R4: respeta estrictamente el orden FIFO con múltiples candidatos elegibles', () => {
    const waitlist = [
      { id: 'e3', userId: 'u3', position: 3, sessionSlot: targetSlot, confirmedSlots: [] },
      { id: 'e1', userId: 'u1', position: 1, sessionSlot: targetSlot, confirmedSlots: [] },
      { id: 'e2', userId: 'u2', position: 2, sessionSlot: targetSlot, confirmedSlots: [] },
    ];
    // Debe devolver u1 (posición 1) sin importar el orden original del array
    expect(findPromotionCandidate(waitlist, slot(10, 12))).toBe('u1');
  });
});
