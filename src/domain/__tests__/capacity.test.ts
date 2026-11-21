import { describe, it, expect } from 'vitest';
import { hasCapacity, isValidCapacity } from '../capacity';

describe('R1 - Validación de capacidad', () => {
  it('cupo 0: no hay capacidad', () => {
    expect(hasCapacity(0, 0)).toBe(false);
  });

  it('cupo 1 con 0 confirmados: hay capacidad', () => {
    expect(hasCapacity(1, 0)).toBe(true);
  });

  it('cupo exacto: no hay capacidad (ya lleno)', () => {
    expect(hasCapacity(5, 5)).toBe(false);
  });

  it('cupo mayor que confirmados: hay capacidad', () => {
    expect(hasCapacity(10, 7)).toBe(true);
  });

  it('isValidCapacity acepta 0', () => {
    expect(isValidCapacity(0)).toBe(true);
  });

  it('isValidCapacity rechaza negativos', () => {
    expect(isValidCapacity(-1)).toBe(false);
  });

  it('isValidCapacity rechaza decimales', () => {
    expect(isValidCapacity(1.5)).toBe(false);
  });
});
