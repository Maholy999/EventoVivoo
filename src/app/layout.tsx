import type { Metadata } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Suspense } from 'react';
import { HeaderNav } from './components/HeaderNav';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
});

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-mono',
});

export const metadata: Metadata = {
  title: 'EventoVivo — Programa Oficial del Evento Universitario',
  description: 'Programa en vivo, control inteligente de cupos, asistencia QR y acreditación instantánea.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${bricolage.variable} ${ibmMono.variable}`}>
      <body style={{ backgroundColor: 'var(--papel)', color: 'var(--tinta)' }}>
        <header
          style={{
            backgroundColor: 'var(--papel)',
            borderBottom: '2px solid var(--tinta)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '64px',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'var(--tinta)',
                  color: 'var(--papel)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '2px',
                }}
              >
                EV
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  EventoVivo
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--tinta-suave)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Programa Oficial
                </span>
              </div>
            </Link>

            <Suspense fallback={<div style={{ height: '36px', width: '240px' }} />}>
              <HeaderNav />
            </Suspense>
          </div>
        </header>

        {children}

        <footer
          style={{
            backgroundColor: 'var(--papel-calido)',
            borderTop: '1px solid var(--linea)',
            padding: '24px 0',
            marginTop: '40px',
            fontSize: '12px',
            color: 'var(--tinta-suave)',
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div>
              <strong>EventoVivo</strong> · Programa impreso en vivo con control atómico de aforos y acreditación QR.
            </div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>
              Acceso universitario sin sobrecupos · 2026
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
