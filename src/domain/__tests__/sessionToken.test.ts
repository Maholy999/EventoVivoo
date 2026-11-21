import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from '../sessionToken';

describe('Autenticación - Tokens de sesión con HMAC', () => {
  const secret = 'super_secret_test_key_123456789012';

  it('crea y verifica un token de sesión válido', () => {
    const payload = {
      userId: 'user-uuid-1',
      role: 'participant' as const,
      expiresAt: Date.now() + 1000 * 60 * 60, // 1 hora en el futuro
    };

    const token = createSessionToken(payload, secret);
    expect(token).toContain('.');

    const verified = verifySessionToken(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user-uuid-1');
    expect(verified?.role).toBe('participant');
  });

  it('rechaza tokens manipulados o alterados', () => {
    const payload = {
      userId: 'user-uuid-1',
      role: 'participant' as const,
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = createSessionToken(payload, secret);
    const tampered = token.slice(0, -3) + 'xyz';

    expect(verifySessionToken(tampered, secret)).toBeNull();
  });

  it('rechaza tokens firmados con otro secreto', () => {
    const payload = {
      userId: 'user-uuid-1',
      role: 'organizer' as const,
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = createSessionToken(payload, 'secret_A_12345678901234567890');
    expect(verifySessionToken(token, 'secret_B_12345678901234567890')).toBeNull();
  });

  it('rechaza tokens expirados', () => {
    const payload = {
      userId: 'user-uuid-1',
      role: 'organizer' as const,
      expiresAt: Date.now() - 1000, // En el pasado
    };

    const token = createSessionToken(payload, secret);
    expect(verifySessionToken(token, secret)).toBeNull();
  });
});
