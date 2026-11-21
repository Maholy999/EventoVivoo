import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './domain/sessionToken';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proteger rutas de organizador: /organizer/* o /api/organizer/*
  if (pathname.startsWith('/organizer') || pathname.startsWith('/api/organizer')) {
    const sessionCookie = req.cookies.get('eventovivo_session');
    if (!sessionCookie || !sessionCookie.value) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const secret = process.env.SESSION_SECRET || 'secret_de_desarrollo_inseguro_32_chars';
    const payload = verifySessionToken(sessionCookie.value, secret);

    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // VALIDACIÓN ESTRICTA EN EL SERVIDOR: participante en ruta de organizador -> 403
    if (payload.role !== 'organizer') {
      return NextResponse.json(
        { error: 'Acceso prohibido: se requiere rol de organizador' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/organizer/:path*', '/api/organizer/:path*'],
};
