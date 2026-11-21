import { describe, it, expect, afterEach } from 'vitest';
import {
  getCurrentUser,
  setTestCurrentUser,
  clearTestCurrentUser,
} from '@/lib/getCurrentUser';

describe('Inyección de usuario en pruebas (getCurrentUser)', () => {
  afterEach(() => {
    clearTestCurrentUser();
  });

  it('retorna null por defecto si no hay usuario inyectado ni cookie', async () => {
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('permite inyectar un usuario para tests sin depender de cookies', async () => {
    setTestCurrentUser({
      id: 'mock-user-123',
      email: 'mock@test.com',
      name: 'Usuario Mock',
      role: 'organizer',
    });

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe('mock-user-123');
    expect(user?.role).toBe('organizer');
  });

  it('limpia el usuario inyectado con clearTestCurrentUser', async () => {
    setTestCurrentUser({
      id: 'mock-user-123',
      email: 'mock@test.com',
      name: 'Usuario Mock',
      role: 'participant',
    });

    clearTestCurrentUser();
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
