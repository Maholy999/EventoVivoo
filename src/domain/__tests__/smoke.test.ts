import { describe, it, expect } from 'vitest';

describe('Smoke test', () => {
  it('el entorno de pruebas funciona', () => {
    expect(1 + 1).toBe(2);
  });

  it('las variables de dominio existen', () => {
    const SESSION_STATUSES = ['draft', 'published', 'cancelled'] as const;
    expect(SESSION_STATUSES).toHaveLength(3);
  });
});
