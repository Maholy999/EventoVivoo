import crypto from 'crypto';

/**
 * R9: Genera un token QR no adivinable (128 bits = 16 bytes → 32 hex chars).
 * Garantiza entropía criptográfica y evita IDs secuenciales.
 */
export function generateQrToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * R9: Valida si una cadena cumple con la especificación de token seguro de 128 bits.
 */
export function isValidQrToken(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}
