import { describe, it, expect } from 'vitest';
import { validateSessionInput } from '../sessionValidation';

describe('R17 - Validación de campos de sesión', () => {
  const validData = {
    title: 'Taller de Arquitectura Limpia',
    type: 'taller' as const,
    description: 'Aprende patrones de diseño y TDD.',
    location: 'Aula Magna',
    starts_at: new Date('2026-11-25T10:00:00Z'),
    ends_at: new Date('2026-11-25T12:00:00Z'),
    capacity: 25,
  };

  it('acepta una sesión válida con todos los campos requeridos', () => {
    const result = validateSessionInput(validData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza si el título está vacío', () => {
    const result = validateSessionInput({ ...validData, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    expect(result.errors.find((e) => e.field === 'title')?.message).toContain('obligatorio');
  });

  it('rechaza tipo de sesión no permitido', () => {
    const result = validateSessionInput({ ...validData, type: 'webinar_inventado' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'type')).toBe(true);
  });

  it('acepta los 4 tipos permitidos: taller, hackatón, conferencia, encuentro', () => {
    for (const type of ['taller', 'hackatón', 'conferencia', 'encuentro'] as const) {
      const result = validateSessionInput({ ...validData, type });
      expect(result.valid).toBe(true);
    }
  });

  it('rechaza cupo menor a 1 (cupo = 0 o negativo)', () => {
    const resZero = validateSessionInput({ ...validData, capacity: 0 });
    expect(resZero.valid).toBe(false);
    expect(resZero.errors.some((e) => e.field === 'capacity')).toBe(true);
    expect(resZero.errors.find((e) => e.field === 'capacity')?.message).toContain('mayor o igual a 1');

    const resNeg = validateSessionInput({ ...validData, capacity: -5 });
    expect(resNeg.valid).toBe(false);
  });

  it('rechaza hora de fin anterior o igual a la hora de inicio (fin <= inicio)', () => {
    const resEqual = validateSessionInput({
      ...validData,
      starts_at: new Date('2026-11-25T10:00:00Z'),
      ends_at: new Date('2026-11-25T10:00:00Z'),
    });
    expect(resEqual.valid).toBe(false);
    expect(resEqual.errors.some((e) => e.field === 'ends_at')).toBe(true);
    expect(resEqual.errors.find((e) => e.field === 'ends_at')?.message).toContain('posterior a la hora de inicio');

    const resBefore = validateSessionInput({
      ...validData,
      starts_at: new Date('2026-11-25T12:00:00Z'),
      ends_at: new Date('2026-11-25T10:00:00Z'),
    });
    expect(resBefore.valid).toBe(false);
    expect(resBefore.errors.some((e) => e.field === 'ends_at')).toBe(true);
  });
});
