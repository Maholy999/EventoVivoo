import { describe, it, expect } from 'vitest';
import { canTransitionSessionState } from '../sessionState';

describe('R12 - Máquina de estados de sesión', () => {
  it('permite transición de draft a published', () => {
    const result = canTransitionSessionState('draft', 'published');
    expect(result.allowed).toBe(true);
  });

  it('permite transición de published a cancelled', () => {
    const result = canTransitionSessionState('published', 'cancelled');
    expect(result.allowed).toBe(true);
  });

  it('permite transición de draft a cancelled', () => {
    const result = canTransitionSessionState('draft', 'cancelled');
    expect(result.allowed).toBe(true);
  });

  it('prohíbe reactivar una sesión cancelada', () => {
    const res1 = canTransitionSessionState('cancelled', 'published');
    expect(res1.allowed).toBe(false);
    expect(res1.error).toContain('cancelada');

    const res2 = canTransitionSessionState('cancelled', 'draft');
    expect(res2.allowed).toBe(false);
  });

  it('permite mantener el mismo estado', () => {
    expect(canTransitionSessionState('draft', 'draft').allowed).toBe(true);
    expect(canTransitionSessionState('published', 'published').allowed).toBe(true);
  });
});
