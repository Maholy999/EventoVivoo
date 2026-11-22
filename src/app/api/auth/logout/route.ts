import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Si la petición viene de un formulario HTML tradicional en el navegador, redirigir a /login
  const acceptHeader = req.headers.get('accept') || '';
  const isHtml = acceptHeader.includes('text/html') || req.headers.get('content-type')?.includes('application/x-www-form-urlencoded');

  const redirectUrl = new URL('/login', req.url);
  const response = isHtml
    ? NextResponse.redirect(redirectUrl, 303)
    : NextResponse.json({ message: 'Sesión cerrada exitosamente', redirect: '/login' });

  response.cookies.set({
    name: 'eventovivo_session',
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });

  return response;
}
