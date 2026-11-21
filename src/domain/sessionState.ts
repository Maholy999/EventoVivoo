export type SessionLifecycleState = 'draft' | 'published' | 'cancelled';

export interface StateTransitionResult {
  allowed: boolean;
  error?: string;
}

/**
 * R12: Máquina de estados para sesiones.
 * - Transiciones válidas:
 *   draft -> published
 *   published -> cancelled
 *   draft -> cancelled
 * - Una sesión cancelada no puede reactivarse.
 */
export function canTransitionSessionState(
  from: SessionLifecycleState,
  to: SessionLifecycleState
): StateTransitionResult {
  if (from === to) {
    return { allowed: true };
  }

  if (from === 'cancelled') {
    return {
      allowed: false,
      error: 'Una sesión cancelada no puede cambiar de estado',
    };
  }

  if (from === 'draft' && (to === 'published' || to === 'cancelled')) {
    return { allowed: true };
  }

  if (from === 'published' && to === 'cancelled') {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `Transición inválida de ${from} a ${to}`,
  };
}
