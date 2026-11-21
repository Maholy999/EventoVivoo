export interface SurveyInput {
  enrollmentId: string;
  hasAttended: boolean;
  alreadySubmitted: boolean;
  rating: number;
  comment?: string | null;
}

export type SurveyValidationError =
  | 'NOT_ATTENDED'
  | 'ALREADY_SUBMITTED'
  | 'INVALID_RATING';

/**
 * R10: Validación de encuesta de satisfacción.
 * - Solo quien asistió puede responder.
 * - Solo una vez por sesión.
 * - Calificación obligatoria de 1 a 5.
 * - Comentario opcional.
 */
export function validateSurveySubmission(
  input: SurveyInput
): SurveyValidationError | null {
  if (!input.hasAttended) {
    return 'NOT_ATTENDED';
  }

  if (input.alreadySubmitted) {
    return 'ALREADY_SUBMITTED';
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return 'INVALID_RATING';
  }

  return null;
}
