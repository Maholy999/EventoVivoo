import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { UserRepository } from '@/repositories/UserRepository';
import { AuthService } from '@/services/authService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userRepo = new UserRepository(pool);
    const authService = new AuthService(userRepo);

    const result = await authService.register({
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role,
    });

    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno al registrar usuario' }, { status: 500 });
  }
}
