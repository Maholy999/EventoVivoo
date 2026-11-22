export type SessionType = 'taller' | 'hackatón' | 'conferencia' | 'encuentro';
export const VALID_SESSION_TYPES: SessionType[] = ['taller', 'hackatón', 'conferencia', 'encuentro'];

export interface SessionInput {
  title: string;
  type: SessionType | string;
  description?: string | null;
  location?: string | null;
  starts_at: Date | string;
  ends_at: Date | string;
  capacity: number;
  status?: 'draft' | 'published' | 'cancelled';
}

export interface SessionValidationError {
  field: string;
  message: string;
}

export function validateSessionInput(input: Partial<SessionInput>): {
  valid: boolean;
  errors: SessionValidationError[];
} {
  const errors: SessionValidationError[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'El título de la sesión es obligatorio.' });
  }

  if (!input.type || !VALID_SESSION_TYPES.includes(input.type as SessionType)) {
    errors.push({
      field: 'type',
      message: 'El tipo debe ser taller, hackatón, conferencia o encuentro.',
    });
  }

  if (
    input.capacity === undefined ||
    input.capacity === null ||
    isNaN(Number(input.capacity)) ||
    Number(input.capacity) < 1
  ) {
    errors.push({
      field: 'capacity',
      message: 'El cupo debe ser un número entero mayor o igual a 1.',
    });
  }

  if (!input.starts_at) {
    errors.push({ field: 'starts_at', message: 'La fecha y hora de inicio son obligatorias.' });
  }

  if (!input.ends_at) {
    errors.push({ field: 'ends_at', message: 'La fecha y hora de fin son obligatorias.' });
  }

  if (input.starts_at && input.ends_at) {
    const start = new Date(input.starts_at);
    const end = new Date(input.ends_at);

    if (isNaN(start.getTime())) {
      errors.push({ field: 'starts_at', message: 'Fecha de inicio inválida.' });
    }
    if (isNaN(end.getTime())) {
      errors.push({ field: 'ends_at', message: 'Fecha de fin inválida.' });
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (end.getTime() <= start.getTime()) {
        errors.push({
          field: 'ends_at',
          message: 'La hora de fin debe ser posterior a la hora de inicio.',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
