import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('Autenticación - Hash seguro de contraseñas', () => {
  it('hashea la contraseña con formato scrypt:salt:key', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('genera diferentes hashes para la misma contraseña (salts distintos)', async () => {
    const h1 = await hashPassword('password123');
    const h2 = await hashPassword('password123');
    expect(h1).not.toBe(h2);
  });

  it('verifica exitosamente la contraseña correcta', async () => {
    const hash = await hashPassword('miPasswordSeguro!');
    const isValid = await verifyPassword('miPasswordSeguro!', hash);
    expect(isValid).toBe(true);
  });

  it('rechaza contraseñas incorrectas', async () => {
    const hash = await hashPassword('miPasswordSeguro!');
    const isValid = await verifyPassword('passwordErroneo', hash);
    expect(isValid).toBe(false);
  });

  it('rechaza contraseñas con menos de 6 caracteres', async () => {
    await expect(hashPassword('12345')).rejects.toThrow('al menos 6 caracteres');
  });
});
