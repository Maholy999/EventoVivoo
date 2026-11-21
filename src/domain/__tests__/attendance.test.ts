import { describe, it, expect } from 'vitest';
import { evaluateAttendance } from '../attendance';

describe('R6 - Asistencia idempotente', () => {
  it('registra asistencia si está confirmado y no hay registro previo', () => {
    const result = evaluateAttendance(true, null);
    expect(result.kind).toBe('recorded');
  });

  it('devuelve already_registered con hora original si se vuelve a escanear', () => {
    const original = new Date('2026-01-01T10:00:00Z');
    const result = evaluateAttendance(true, { recordedAt: original });
    expect(result.kind).toBe('already_registered');
    if (result.kind === 'already_registered') {
      expect(result.originalRecordedAt).toEqual(original);
    }
  });

  it('rechaza asistencia si el participante no está confirmado', () => {
    const result = evaluateAttendance(false, null);
    expect(result.kind).toBe('not_confirmed');
  });

  it('rechaza asistencia no confirmada incluso si ya existiera un registro', () => {
    const original = new Date('2026-01-01T10:00:00Z');
    const result = evaluateAttendance(false, { recordedAt: original });
    expect(result.kind).toBe('not_confirmed');
  });
});
