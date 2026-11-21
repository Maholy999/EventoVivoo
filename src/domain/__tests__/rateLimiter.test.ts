import { describe, it, expect } from 'vitest';
import { LoginRateLimiter } from '../rateLimiter';

describe('Autenticación - Rate limiting de login', () => {
  it('permite hasta el límite de intentos configurado', () => {
    const limiter = new LoginRateLimiter({ maxAttempts: 3, windowMs: 10000 });
    const key = '127.0.0.1:test@test.com';

    expect(limiter.isLimited(key)).toBe(false);
    limiter.recordFailedAttempt(key);
    expect(limiter.isLimited(key)).toBe(false);
    limiter.recordFailedAttempt(key);
    expect(limiter.isLimited(key)).toBe(false);
    limiter.recordFailedAttempt(key); // 3er intento
    expect(limiter.isLimited(key)).toBe(true);
  });

  it('resetea los intentos tras un login exitoso', () => {
    const limiter = new LoginRateLimiter({ maxAttempts: 3, windowMs: 10000 });
    const key = '127.0.0.1:test@test.com';

    limiter.recordFailedAttempt(key);
    limiter.recordFailedAttempt(key);
    limiter.recordFailedAttempt(key);
    expect(limiter.isLimited(key)).toBe(true);

    limiter.reset(key);
    expect(limiter.isLimited(key)).toBe(false);
  });

  it('expira el bloqueo una vez transcurrida la ventana de tiempo', () => {
    const limiter = new LoginRateLimiter({ maxAttempts: 2, windowMs: 1000 });
    const key = '127.0.0.1:test@test.com';
    const t0 = 1000000;

    limiter.recordFailedAttempt(key, t0);
    limiter.recordFailedAttempt(key, t0 + 100);
    expect(limiter.isLimited(key, t0 + 200)).toBe(true);

    // Tras 1001ms expira la ventana
    expect(limiter.isLimited(key, t0 + 1001)).toBe(false);
  });
});
