import { describe, it, expect } from 'vitest';
import { isOrganizer, assertOrganizer, AuthorizationError, AuthenticationError } from '../rbac';

describe('RBAC - Control de acceso basado en roles', () => {
  it('reconoce rol de organizador', () => {
    expect(isOrganizer('organizer')).toBe(true);
    expect(isOrganizer('participant')).toBe(false);
    expect(isOrganizer(null)).toBe(false);
  });

  it('assertOrganizer no arroja error con usuario organizador', () => {
    expect(() =>
      assertOrganizer({
        id: 'u1',
        email: 'org@test.com',
        name: 'Organizador',
        role: 'organizer',
      })
    ).not.toThrow();
  });

  it('assertOrganizer arroja AuthorizationError (403) si es participante', () => {
    try {
      assertOrganizer({
        id: 'u2',
        email: 'part@test.com',
        name: 'Participante',
        role: 'participant',
      });
      expect.fail('Debió arrojar AuthorizationError');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).status).toBe(403);
    }
  });

  it('assertOrganizer arroja AuthenticationError (401) si no hay usuario', () => {
    try {
      assertOrganizer(null);
      expect.fail('Debió arrojar AuthenticationError');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthenticationError);
      expect((err as AuthenticationError).status).toBe(401);
    }
  });
});
