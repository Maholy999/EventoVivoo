import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/getCurrentUser';

export const metadata: Metadata = {
  title: 'EventoVivo — Experiencias Universitarias en Vivo',
  description: 'Gestión inteligente de aforos, accesos QR y agendas universitarias en tiempo real.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

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

            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link
                href="/"
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--text-light)',
                }}
              >
                Agenda
              </Link>

              {user?.role === 'organizer' && (
                <Link
                  href="/organizer"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                    }}
                  />
                  Panel Organizador
                </Link>
              )}

              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      padding: '4px 10px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                    }}
                  >
                    {user.name || user.role}
                  </span>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Salir
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="btn-primary"
                  style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                >
                  Ingresar
                </Link>
              )}
            </nav>
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
