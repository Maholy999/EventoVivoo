import crypto from 'crypto';

/**
 * Hashing seguro de contraseñas usando scrypt (recomendado por OWASP).
 * Genera salt criptográfico aleatorio de 16 bytes y clave de 64 bytes.
 * Las comparaciones se hacen en tiempo constante (timingSafeEqual) contra ataques de temporización.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, salt, originalKeyHex] = parts;
  const originalKey = Buffer.from(originalKeyHex, 'hex');

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(originalKey, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}
