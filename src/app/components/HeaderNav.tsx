import Link from 'next/link';
import { getCurrentUser } from '@/lib/getCurrentUser';

export async function HeaderNav() {
  const user = await getCurrentUser();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* Nombres finales sección 3: "Explorar eventos" y "Programa del día" */}
      <Link
        href="/"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--tinta)',
          padding: '4px 8px',
        }}
      >
        Explorar eventos
      </Link>

      <Link
        href="/#programa"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--tinta)',
          padding: '4px 8px',
        }}
      >
        Programa del día
      </Link>

      {/* Si es Organizador: interfaz propia (R13) */}
      {user?.role === 'organizer' && (
        <Link
          href="/organizer"
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#FFFFFF',
            backgroundColor: 'var(--tinta)',
            padding: '6px 12px',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--senal)',
              borderRadius: '50%',
            }}
          />
          Operación en vivo
        </Link>
      )}

      {/* Si es Participante */}
      {user && user.role !== 'organizer' && (
        <>
          <Link
            href="/#mis-inscripciones"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--tinta)',
              padding: '4px 8px',
            }}
          >
            Mis inscripciones
          </Link>
          <Link
            href="/#avisos"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--tinta)',
              padding: '4px 8px',
            }}
          >
            Avisos
          </Link>
        </>
      )}

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--tinta-suave)',
              backgroundColor: 'var(--papel-calido)',
              border: '1px solid var(--linea)',
              padding: '3px 8px',
              borderRadius: '2px',
            }}
          >
            {user.name} ({user.role === 'organizer' ? 'Organizador' : 'Participante'})
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--tinta-suave)',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px',
              }}
            >
              Salir
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="btn-senal"
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          Iniciar sesión
        </Link>
      )}
    </nav>
  );
}
