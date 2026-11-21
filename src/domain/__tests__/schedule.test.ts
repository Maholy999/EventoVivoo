import { describe, it, expect } from 'vitest';
import { overlaps, hasScheduleConflict } from '../schedule';

const slot = (startH: number, endH: number) => ({
  starts_at: new Date(`2026-01-01T${String(startH).padStart(2, '0')}:00:00Z`),
  ends_at: new Date(`2026-01-01T${String(endH).padStart(2, '0')}:00:00Z`),
});

describe('R2 - Detección de traslapes', () => {
  it('no choca cuando son consecutivas (fin_A === inicio_B)', () => {
    expect(overlaps(slot(10, 12), slot(12, 14))).toBe(false);
  });

  it('no choca cuando son consecutivas (fin_B === inicio_A)', () => {
    expect(overlaps(slot(12, 14), slot(10, 12))).toBe(false);
  });

  it('choca con traslape parcial al inicio', () => {
    expect(overlaps(slot(10, 12), slot(11, 13))).toBe(true);
  });

  it('choca con traslape parcial al final', () => {
    expect(overlaps(slot(11, 13), slot(10, 12))).toBe(true);
  });

  it('choca cuando una sesión contiene a la otra', () => {
    expect(overlaps(slot(9, 15), slot(10, 12))).toBe(true);
  });

  it('choca cuando son exactamente iguales', () => {
    expect(overlaps(slot(10, 12), slot(10, 12))).toBe(true);
  });

  it('no choca cuando están completamente separadas', () => {
    expect(overlaps(slot(10, 12), slot(14, 16))).toBe(false);
  });

  it('hasScheduleConflict detecta conflicto en lista de sesiones', () => {
    expect(hasScheduleConflict(slot(10, 12), [slot(8, 10), slot(11, 13)])).toBe(true);
  });

  it('hasScheduleConflict no detecta conflicto cuando no hay traslape', () => {
    expect(hasScheduleConflict(slot(10, 12), [slot(8, 10), slot(12, 14)])).toBe(false);
  });

  it('hasScheduleConflict retorna false con lista vacía', () => {
    expect(hasScheduleConflict(slot(10, 12), [])).toBe(false);
  });
});
