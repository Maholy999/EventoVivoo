import { describe, it, expect } from 'vitest';
import { generateQrToken, isValidQrToken } from '../qr';

describe('R9 - Token QR seguro', () => {
  it('genera un token de exactamente 32 caracteres hexadecimales (128 bits)', () => {
    const token = generateQrToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('genera tokens únicos en llamadas consecutivas (sin colisiones)', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateQrToken()));
    expect(tokens.size).toBe(100);
  });

  it('isValidQrToken acepta tokens válidos generados', () => {
    expect(isValidQrToken(generateQrToken())).toBe(true);
  });

  it('isValidQrToken rechaza tokens demasiado cortos', () => {
    expect(isValidQrToken('abc123')).toBe(false);
  });

  it('isValidQrToken rechaza caracteres no hexadecimales', () => {
    expect(isValidQrToken('z'.repeat(32))).toBe(false);
  });

  it('isValidQrToken rechaza IDs secuenciales numéricos simples', () => {
    expect(isValidQrToken('1')).toBe(false);
    expect(isValidQrToken('12345')).toBe(false);
  });
});
