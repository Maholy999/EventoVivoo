import { IUserRepository, DbUser } from '@/repositories/IUserRepository';
import { hashPassword, verifyPassword } from '@/domain/password';
import { createSessionToken } from '@/domain/sessionToken';
import { LoginRateLimiter } from '@/domain/rateLimiter';
import { UserRole } from '@/lib/getCurrentUser';

export const globalLoginRateLimiter = new LoginRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private rateLimiter: LoginRateLimiter = globalLoginRateLimiter
  ) {}

  async register(params: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<{ user?: DbUser; error?: string }> {
    if (!params.email || !params.password || !params.name) {
      return { error: 'Todos los campos son obligatorios' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.email)) {
      return { error: 'Correo electrónico inválido' };
    }

    const existing = await this.userRepo.findByEmail(params.email);
    if (existing) {
      return { error: 'El correo electrónico ya está registrado' };
    }

    const passwordHash = await hashPassword(params.password);
    const role: UserRole = params.role === 'organizer' ? 'organizer' : 'participant';

    const user = await this.userRepo.createUser({
      email: params.email,
      password_hash: passwordHash,
      name: params.name,
      role,
    });

    return { user };
  }

  async login(params: {
    email: string;
    password: string;
    ipOrClientKey: string;
  }): Promise<{ token?: string; user?: DbUser; error?: string; status?: number }> {
    if (!params.email || !params.password) {
      return { error: 'Correo y contraseña obligatorios', status: 400 };
    }

    const rateKey = `${params.ipOrClientKey}:${params.email.toLowerCase()}`;
    if (this.rateLimiter.isLimited(rateKey)) {
      return {
        error: 'Demasiados intentos fallidos. Intenta más tarde.',
        status: 429,
      };
    }

    const user = await this.userRepo.findByEmail(params.email);
    if (!user) {
      this.rateLimiter.recordFailedAttempt(rateKey);
      return { error: 'Credenciales inválidas', status: 401 };
    }

    const isValid = await verifyPassword(params.password, user.password_hash);
    if (!isValid) {
      this.rateLimiter.recordFailedAttempt(rateKey);
      return { error: 'Credenciales inválidas', status: 401 };
    }

    this.rateLimiter.reset(rateKey);

    const secret = process.env.SESSION_SECRET || 'secret_de_desarrollo_inseguro_32_chars';
    const expiresDays = parseInt(process.env.SESSION_EXPIRES_DAYS || '7', 10);
    const expiresAt = Date.now() + expiresDays * 24 * 60 * 60 * 1000;

    const token = createSessionToken(
      {
        userId: user.id,
        role: user.role,
        expiresAt,
      },
      secret
    );

    return { token, user };
  }
}
