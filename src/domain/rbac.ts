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
 * Valida que el usuario tenga rol de organizador, arrojando 403 si es participante
 * o 401 si no está autenticado.
 */
export function assertOrganizer(user: CurrentUser | null): asserts user is CurrentUser {
  if (!user) {
    throw new AuthenticationError();
  }
  if (!isOrganizer(user.role)) {
    throw new AuthorizationError();
  }
}
