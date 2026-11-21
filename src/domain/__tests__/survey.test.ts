import { describe, it, expect } from 'vitest';
import { validateSurveySubmission } from '../survey';

describe('R10 - Encuesta de satisfacción', () => {
  it('permite enviar encuesta si asistió y no la había enviado', () => {
    const error = validateSurveySubmission({
      enrollmentId: 'enr-1',
      hasAttended: true,
      alreadySubmitted: false,
      rating: 5,
      comment: 'Excelente taller',
    });
    expect(error).toBeNull();
  });

  it('rechaza encuesta si el participante no registró asistencia', () => {
    const error = validateSurveySubmission({
      enrollmentId: 'enr-1',
      hasAttended: false,
      alreadySubmitted: false,
      rating: 4,
    });
    expect(error).toBe('NOT_ATTENDED');
  });

  it('rechaza encuesta si ya fue respondida anteriormente', () => {
    const error = validateSurveySubmission({
      enrollmentId: 'enr-1',
      hasAttended: true,
      alreadySubmitted: true,
      rating: 4,
    });
    expect(error).toBe('ALREADY_SUBMITTED');
  });

  it('rechaza calificaciones fuera del rango 1 a 5', () => {
    expect(
      validateSurveySubmission({
        enrollmentId: 'enr-1',
        hasAttended: true,
        alreadySubmitted: false,
        rating: 0,
      })
    ).toBe('INVALID_RATING');

    expect(
      validateSurveySubmission({
        enrollmentId: 'enr-1',
        hasAttended: true,
        alreadySubmitted: false,
        rating: 6,
      })
    ).toBe('INVALID_RATING');

    expect(
      validateSurveySubmission({
        enrollmentId: 'enr-1',
        hasAttended: true,
        alreadySubmitted: false,
        rating: 3.5,
      })
    ).toBe('INVALID_RATING');
  });
});
