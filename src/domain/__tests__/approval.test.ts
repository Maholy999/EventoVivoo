import { describe, it, expect } from 'vitest';
import { determineEnrollmentStatus, evaluateApproval } from '../approval';

describe('Hito 4 / F13 - Inscripción con aprobación previa por sesión', () => {
  describe('determineEnrollmentStatus', () => {
    it('si la sesión requiere aprobación, queda en "pending" sin consumir cupo', () => {
      const status = determineEnrollmentStatus(true, 5, 20);
      expect(status).toBe('pending');
    });

    it('si la sesión NO requiere aprobación y hay cupo, queda "confirmed"', () => {
      const status = determineEnrollmentStatus(false, 15, 20);
      expect(status).toBe('confirmed');
    });

    it('si la sesión NO requiere aprobación y está llena, queda "waitlisted"', () => {
      const status = determineEnrollmentStatus(false, 20, 20);
      expect(status).toBe('waitlisted');
    });
  });

  describe('evaluateApproval', () => {
    it('al aprobar con cupo disponible y sin choques, confirma la inscripción', () => {
      const result = evaluateApproval({
        capacity: 25,
        confirmedCount: 20,
        hasScheduleConflict: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.targetStatus).toBe('confirmed');
      }
    });

    it('al aprobar si el aforo ya se completó, pasa a lista de espera', () => {
      const result = evaluateApproval({
        capacity: 25,
        confirmedCount: 25,
        hasScheduleConflict: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.targetStatus).toBe('waitlisted');
      }
    });

    it('al aprobar si el participante tiene choque de horario, rechaza la aprobación', () => {
      const result = evaluateApproval({
        capacity: 25,
        confirmedCount: 10,
        hasScheduleConflict: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('SCHEDULE_CONFLICT');
      }
    });
  });
});
