import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { UserRepository } from '@/repositories/UserRepository';
import { AuthService } from '@/services/authService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const userRepo = new UserRepository(pool);
    const authService = new AuthService(userRepo);

    const result = await authService.login({
      email: body.email,
      password: body.password,
      ipOrClientKey: ip,
    });

    if (result.error || !result.token || !result.user) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 401 }
      );
    }

    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });

    const expiresDays = parseInt(process.env.SESSION_EXPIRES_DAYS || '7', 10);
    response.cookies.set({
      name: 'eventovivo_session',
      value: result.token,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresDays * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Error interno en login' }, { status: 500 });
  }
}
