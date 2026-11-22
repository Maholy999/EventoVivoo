import { CurrentUser, UserRole } from '@/lib/getCurrentUser';

export class AuthorizationError extends Error {
  public readonly status: number = 403;
  constructor(message: string = 'Acceso denegado: se requieren permisos de organizador') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AuthenticationError extends Error {
  public readonly status: number = 401;
  constructor(message: string = 'No autenticado') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * RBAC: Validación en servidor.
 * Retorna true si el usuario tiene rol de organizador.
 */
export function isOrganizer(role: UserRole | undefined | null): boolean {
  return role === 'organizer';
}

/**
 * Retorna true si el usuario tiene rol de participante.
 */
export function isParticipant(role: UserRole | undefined | null): boolean {
  return role === 'participant';
}

/**
 * Valida que el usuario tenga rol de organizador, arrojando 403 si es participante
 * o 401 si no está autenticado.
 */
export function assertOrganizer(user: CurrentUser | null): asserts user is CurrentUser {
  if (!user) {
    throw new AuthenticationError();
  }
  if (!isOrganizer(user.role)) {
    throw new AuthorizationError('Acceso denegado: se requieren permisos de organizador');
  }
}

/**
 * R13: Valida que el usuario tenga rol de participante para acciones exclusivas de participante
 * (inscripción, lista de espera, cancelar plaza, responder encuestas).
 * Si un organizador intenta realizarlas, devuelve 403.
 */
export function assertParticipant(user: CurrentUser | null): asserts user is CurrentUser {
  if (!user) {
    throw new AuthenticationError('Debes iniciar sesión para realizar esta acción');
  }
  if (isOrganizer(user.role)) {
    throw new AuthorizationError(
      'Acceso denegado: los organizadores no pueden inscribirse, cancelar plazas ni responder encuestas (R13)'
    );
  }
}

/**
 * R14: Valida que el organizador actual sea el dueño legítimo de la sesión antes de modificarla.
 * Si intenta editar una sesión ajena, devuelve 403.
 */
export function assertSessionOwner(sessionOrganizerId: string, currentUserId: string): void {
  if (sessionOrganizerId !== currentUserId) {
    throw new AuthorizationError(
      'Acceso denegado: no tienes permisos para modificar sesiones ajenas (R14)'
    );
  }
}
