import Link from 'next/link';
import { getCurrentUser } from '@/lib/getCurrentUser';

export async function HeaderNav() {
  const user = await getCurrentUser();

  return (
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
  );
}
