import { describe, it, expect } from 'vitest';
import { validateEnrollment, decideEnrollmentStatus } from '../enrollment';

const slot = (startH: number, endH: number) => ({
  starts_at: new Date(`2026-01-01T${String(startH).padStart(2, '0')}:00:00Z`),
  ends_at: new Date(`2026-01-01T${String(endH).padStart(2, '0')}:00:00Z`),
});

describe('R2, R3, R12 - validateEnrollment', () => {
  const baseOpts = {
    sessionStatus: 'published' as const,
    alreadyEnrolled: false,
    newSession: slot(10, 12),
    confirmedSessions: [],
  };

  it('R12: rechaza inscripción en sesión en borrador', () => {
    expect(validateEnrollment({ ...baseOpts, sessionStatus: 'draft' })).toBe('SESSION_NOT_PUBLISHED');
  });

  it('R12: rechaza inscripción en sesión cancelada', () => {
    expect(validateEnrollment({ ...baseOpts, sessionStatus: 'cancelled' })).toBe('SESSION_NOT_PUBLISHED');
  });

  it('R3: rechaza duplicado', () => {
    expect(validateEnrollment({ ...baseOpts, alreadyEnrolled: true })).toBe('DUPLICATE');
  });

  it('R2: rechaza choque de horario con traslape parcial', () => {
    expect(validateEnrollment({ ...baseOpts, confirmedSessions: [slot(11, 13)] })).toBe('SCHEDULE_CONFLICT');
  });

  it('R2: permite sesión consecutiva (no choca)', () => {
    expect(validateEnrollment({ ...baseOpts, confirmedSessions: [slot(8, 10)] })).toBeNull();
  });

  it('permite inscripción válida', () => {
    expect(validateEnrollment(baseOpts)).toBeNull();
  });
});

describe('R1, R4 - decideEnrollmentStatus', () => {
  it('R1: retorna confirmed si hay cupo', () => {
    expect(decideEnrollmentStatus(10, 5)).toBe('confirmed');
  });

  it('R4: retorna waitlisted si está llena', () => {
    expect(decideEnrollmentStatus(5, 5)).toBe('waitlisted');
  });

  it('R1: cupo 0 → waitlisted', () => {
    expect(decideEnrollmentStatus(0, 0)).toBe('waitlisted');
  });
});
