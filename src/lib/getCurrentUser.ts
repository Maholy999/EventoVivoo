import { cookies } from 'next/headers';
import { verifySessionToken } from '@/domain/sessionToken';

export type UserRole = 'participant' | 'organizer';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Inyección en memoria para pruebas unitarias e integración (sin depender de cookies reales)
let mockCurrentUser: CurrentUser | null = null;
let mockModeEnabled = false;

export function setTestCurrentUser(user: CurrentUser | null): void {
  mockCurrentUser = user;
  mockModeEnabled = true;
}

export function clearTestCurrentUser(): void {
  mockCurrentUser = null;
  mockModeEnabled = false;
}

/**
 * Obtiene el usuario autenticado actual.
 * - En modo test (cuando se invoca setTestCurrentUser), devuelve el mock inyectado.
 * - En producción/servidor Next.js, lee y valida la cookie httpOnly firmada.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (mockModeEnabled) {
    return mockCurrentUser;
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('eventovivo_session');
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const secret = process.env.SESSION_SECRET || 'secret_de_desarrollo_inseguro_32_chars';
    const payload = verifySessionToken(sessionCookie.value, secret);
    if (!payload) {
      return null;
    }

    // Retorna la identidad validada del payload de la sesión
    return {
      id: payload.userId,
      email: '', // lazy o hidratado si se requiere
      name: '',
      role: payload.role,
    };
  } catch {
    return null;
  }
}
