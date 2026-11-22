import { describe, it, expect } from 'vitest';
import { validateSessionInput } from '../sessionValidation';
import { canTransitionSessionState } from '../sessionState';
import { assertSessionOwner, assertOrganizer, assertParticipant, AuthorizationError } from '../rbac';
import { calculateCapacityReduction } from '../capacityReduction';
import { evaluateAttendance } from '../attendance';

describe('Hito 2 - Flujo integral del organizador (F12, F14, R14, R17)', () => {
  describe('F12 & R17: Creación y validación estricta de sesiones', () => {
    it('valida exitosamente la creación de una sesión con todos sus campos', () => {
      const input = {
        title: 'Taller de Kubernetes y Alta Disponibilidad',
        type: 'taller' as const,
        description: 'Despliegues con cero tiempo de inactividad.',
        location: 'Laboratorio de Cómputo 1',
        starts_at: new Date('2026-12-01T10:00:00Z'),
        ends_at: new Date('2026-12-01T12:00:00Z'),
        capacity: 30,
      };

      const result = validateSessionInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rechaza sesión con fin antes de inicio con mensaje descriptivo en español', () => {
      const input = {
        title: 'Conferencia Inválida',
        type: 'conferencia' as const,
        starts_at: new Date('2026-12-01T15:00:00Z'),
        ends_at: new Date('2026-12-01T14:00:00Z'),
        capacity: 25,
      };

      const result = validateSessionInput(input);
      expect(result.valid).toBe(false);
      const endError = result.errors.find((e) => e.field === 'ends_at');
      expect(endError?.message).toBe('La hora de fin debe ser posterior a la hora de inicio.');
    });

    it('rechaza sesión con cupo menor a 1 (cupo = 0 o negativo)', () => {
      const resZero = validateSessionInput({
        title: 'Encuentro sin cupo',
        type: 'encuentro' as const,
        starts_at: new Date('2026-12-01T10:00:00Z'),
        ends_at: new Date('2026-12-01T11:00:00Z'),
        capacity: 0,
      });
      expect(resZero.valid).toBe(false);
      expect(resZero.errors.find((e) => e.field === 'capacity')?.message).toContain('mayor o igual a 1');
    });

    it('permite publicar una sesión en borrador', () => {
      const transition = canTransitionSessionState('draft', 'published');
      expect(transition.allowed).toBe(true);
    });

    it('rechaza republicar una sesión ya cancelada', () => {
      const transition = canTransitionSessionState('cancelled', 'published');
      expect(transition.allowed).toBe(false);
      expect(transition.error).toContain('cancelada');
    });
  });

  describe('R14: Propiedad de sesiones y permisos RBAC', () => {
    const orgOwner = { id: 'org-owner-1', role: 'organizer' as const, email: 'org1@test.com', name: 'Org 1' };
    const orgStranger = { id: 'org-stranger-2', role: 'organizer' as const, email: 'org2@test.com', name: 'Org 2' };
    const participant = { id: 'part-1', role: 'participant' as const, email: 'part@test.com', name: 'Part 1' };

    it('el dueño de la sesión puede editarla sin error', () => {
      expect(() => assertSessionOwner('org-owner-1', orgOwner.id)).not.toThrow();
    });

    it('organizador ajeno es rechazado con 403 al intentar editar sesión ajena', () => {
      try {
        assertSessionOwner('org-owner-1', orgStranger.id);
        expect.fail('Debió arrojar 403');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).status).toBe(403);
        expect((err as AuthorizationError).message).toContain('R14');
      }
    });

    it('participante en rutas de organizador es rechazado con 403', () => {
      try {
        assertOrganizer(participant);
        expect.fail('Debió arrojar 403');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).status).toBe(403);
      }
    });

    it('organizador en rutas de participante es rechazado con 403', () => {
      try {
        assertParticipant(orgOwner);
        expect.fail('Debió arrojar 403');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).status).toBe(403);
      }
    });
  });

  describe('F12 & R7: Reducción de aforo con degradación LIFO', () => {
    it('degrada exactamente a los últimos inscritos confirmados a la cabeza de la lista de espera', () => {
      const confirmed = [
        { id: 'enr-1', userId: 'u1', enrolledAt: new Date('2026-11-20T10:00:00Z') },
        { id: 'enr-2', userId: 'u2', enrolledAt: new Date('2026-11-20T10:05:00Z') },
        { id: 'enr-3', userId: 'u3', enrolledAt: new Date('2026-11-20T10:10:00Z') },
      ];
      const existingWaitlist = [
        { id: 'enr-4', userId: 'u4', position: 1 },
      ];

      // Reducir de 3 a 2: u3 debe pasar a waitlist posición 1, u4 pasa a posición 2
      const result = calculateCapacityReduction(2, confirmed, existingWaitlist, 0);
      expect(result.error).toBeUndefined();
      expect(result.plan?.demotedToWaitlist).toHaveLength(1);
      expect(result.plan?.demotedToWaitlist[0].userId).toBe('u3');
      expect(result.plan?.demotedToWaitlist[0].newPosition).toBe(1);
      expect(result.plan?.shiftedWaitlist[0].id).toBe('enr-4');
      expect(result.plan?.shiftedWaitlist[0].newPosition).toBe(2);
    });
  });

  describe('Control de asistencia QR idempotente', () => {
    it('registra asistencia por primera vez si está confirmado', () => {
      const evaluation = evaluateAttendance(true, null);
      expect(evaluation.kind).toBe('recorded');
    });

    it('detecta idempotencia si ya había registrado asistencia previa', () => {
      const prevDate = new Date('2026-11-25T10:15:00Z');
      const evaluation = evaluateAttendance(true, { recordedAt: prevDate });
      expect(evaluation.kind).toBe('already_registered');
      if (evaluation.kind === 'already_registered') {
        expect(evaluation.originalRecordedAt).toEqual(prevDate);
      }
    });

    it('rechaza asistencia si no tiene inscripción confirmada', () => {
      const evaluation = evaluateAttendance(false, null);
      expect(evaluation.kind).toBe('not_confirmed');
    });
  });
});
