import { describe, it, expect } from 'vitest';
import {
  isOrganizer,
  isParticipant,
  assertOrganizer,
  assertParticipant,
  assertSessionOwner,
  AuthorizationError,
  AuthenticationError,
} from '../rbac';

describe('RBAC - Control de acceso basado en roles', () => {
  it('reconoce rol de organizador y participante', () => {
    expect(isOrganizer('organizer')).toBe(true);
    expect(isOrganizer('participant')).toBe(false);
    expect(isOrganizer(null)).toBe(false);

    expect(isParticipant('participant')).toBe(true);
    expect(isParticipant('organizer')).toBe(false);
    expect(isParticipant(null)).toBe(false);
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

  describe('R13 - Separación estricta de roles para acciones de participante', () => {
    it('assertParticipant permite acciones al participante', () => {
      expect(() =>
        assertParticipant({
          id: 'u2',
          email: 'part@test.com',
          name: 'Participante',
          role: 'participant',
        })
      ).not.toThrow();
    });

    it('assertParticipant arroja 403 si el organizador intenta realizar acciones de participante', () => {
      try {
        assertParticipant({
          id: 'u1',
          email: 'org@test.com',
          name: 'Organizador',
          role: 'organizer',
        });
        expect.fail('Debió arrojar 403 para organizador en acción de participante');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).status).toBe(403);
        expect((err as AuthorizationError).message).toContain('organizador');
      }
    });

    it('assertParticipant arroja 401 si no hay usuario autenticado', () => {
      expect(() => assertParticipant(null)).toThrow(AuthenticationError);
    });
  });

  describe('R14 - Propiedad de sesiones por organizador', () => {
    it('assertSessionOwner permite modificar la sesión al organizador dueño', () => {
      expect(() => assertSessionOwner('org-123', 'org-123')).not.toThrow();
    });

    it('assertSessionOwner arroja 403 si un organizador intenta modificar una sesión ajena', () => {
      try {
        assertSessionOwner('org-123', 'org-999');
        expect.fail('Debió arrojar 403');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).status).toBe(403);
        expect((err as AuthorizationError).message).toContain('ajenas');
      }
    });
  });
});
