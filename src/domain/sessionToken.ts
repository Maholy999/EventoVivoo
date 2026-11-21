import crypto from 'crypto';

export interface SessionPayload {
  userId: string;
  role: 'participant' | 'organizer';
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Genera un token firmado con HMAC-SHA256 para la cookie httpOnly.
 * Formato: base64(payload).signature
 */
export function createSessionToken(payload: SessionPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  try {
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    if (!isSigValid) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (Date.now() > payload.expiresAt) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}
