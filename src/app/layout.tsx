import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Suspense } from 'react';
import { HeaderNav } from './components/HeaderNav';

export const metadata: Metadata = {
  title: 'EventoVivo — Experiencias Universitarias en Vivo',
  description: 'Gestión inteligente de aforos, accesos QR y agendas universitarias en tiempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
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
              height: '70px',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  color: 'var(--bg-main)',
                  fontSize: '1.2rem',
                }}
              >
                EV
              </div>
              <div>
                <span
                  className="font-display"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-light)',
                  }}
                >
                  Evento<span style={{ color: 'var(--primary)' }}>Vivo</span>
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Campus Conectado
                </span>
              </div>
            </Link>

            <Suspense fallback={<div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</div>}>
              <HeaderNav />
            </Suspense>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 140px)', padding: '30px 0' }}>
          {children}
        </main>

        <footer
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            padding: '24px 0',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <div className="container">
            EventoVivo &copy; 2026 &mdash; Experiencias universitarias con control de aforo y acceso QR en vivo.
          </div>
        </footer>
      </body>
    </html>
  );
}
