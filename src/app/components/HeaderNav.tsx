import Link from 'next/link';
import { getCurrentUser } from '@/lib/getCurrentUser';

export async function HeaderNav() {
  const user = await getCurrentUser();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
      {/* Enlace al Catálogo Principal */}
      <Link
        href="/"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--tinta)',
          padding: '4px 8px',
          textDecoration: 'none',
        }}
      >
        Explorar eventos
      </Link>

      {/* Si es Organizador: accesos rápidos a su gestión */}
      {user?.role === 'organizer' && (
        <>
          <Link
            href="/organizer"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: 'var(--tinta)',
              padding: '6px 14px',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--senal)',
                borderRadius: '50%',
              }}
            />
            Panel de Organizador
          </Link>
          <Link
            href="/organizer?tab=mis_sesiones&create=true"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: 'var(--senal)',
              padding: '6px 12px',
              borderRadius: '2px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            + Crear sesión
          </Link>
        </>
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
              textDecoration: 'none',
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
              textDecoration: 'none',
            }}
          >
            Avisos
          </Link>
        </>
      )}

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
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
          <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                background: 'none',
                border: '1px solid var(--linea)',
                color: 'var(--tinta-suave)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '2px',
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="btn-senal"
          style={{ fontSize: '13px', padding: '6px 14px', textDecoration: 'none', marginLeft: 'auto' }}
        >
          Iniciar sesión
        </Link>
      )}
    </nav>
  );
}
