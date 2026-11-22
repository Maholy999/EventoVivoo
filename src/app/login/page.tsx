'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    // R15: El registro público crea exclusivamente participantes
    const payload = isRegister ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al procesar la solicitud');
      } else {
        if (isRegister) {
          // Autenticar tras registro
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (loginRes.ok) {
            router.push('/');
            router.refresh();
          } else {
            setIsRegister(false);
            setError('Cuenta creada exitosamente. Por favor, inicia sesión.');
          }
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch {
      setError('Error de conexión con el servidor de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '420px', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/"
          style={{
            fontSize: '12px',
            color: 'var(--tinta)',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          ← Volver a Explorar eventos
        </Link>
      </div>

      <div
        style={{
          backgroundColor: 'var(--papel)',
          border: '2px solid var(--tinta)',
          padding: '28px',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--tinta-suave)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Acceso al Campus Universitario
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 0' }}>
            {isRegister ? 'Registro de Participante' : 'Iniciar sesión'}
          </h1>
          <p style={{ color: 'var(--tinta-suave)', fontSize: '13px', marginTop: '4px' }}>
            {isRegister
              ? 'Crea tu cuenta institucional para inscribirte en talleres y obtener tu credencial QR.'
              : 'Ingresa con tu correo universitario y contraseña.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: '#FFF5F2',
              border: '1px solid var(--senal)',
              color: 'var(--senal)',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sofia Reyes"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--tinta)',
                  fontSize: '13px',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Correo electrónico *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.usuario@universidad.edu"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--tinta)',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Contraseña *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--tinta)',
                fontSize: '13px',
              }}
            />
          </div>

          {isRegister && (
            <div
              style={{
                backgroundColor: 'var(--papel-calido)',
                border: '1px solid var(--linea)',
                padding: '8px 12px',
                fontSize: '11px',
                color: 'var(--tinta-suave)',
              }}
            >
              ℹ️ <strong>Regla R15:</strong> El registro público crea cuentas de participante. Los organizadores son dados de alta por el administrador del evento mediante el seed o CLI.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-senal"
            style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '6px' }}
          >
            {loading ? 'Verificando…' : isRegister ? 'Registrarme' : 'Ingresar al sistema'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--linea)', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tinta)',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta? Regístrate como participante'}
          </button>
        </div>

        {/* Cuentas de demostración rápida */}
        <div
          style={{
            marginTop: '20px',
            backgroundColor: 'var(--papel-calido)',
            border: '1px solid var(--linea)',
            padding: '12px',
            fontSize: '11px',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px' }}>Usuarios de prueba documentados:</strong>
          <div>
            Organizador: <code style={{ fontFamily: 'var(--font-mono)' }}>org1@eventovivo.edu</code> / <code style={{ fontFamily: 'var(--font-mono)' }}>Admin123!</code>
          </div>
          <div>
            Participante: <code style={{ fontFamily: 'var(--font-mono)' }}>participante1@universidad.edu</code> / <code style={{ fontFamily: 'var(--font-mono)' }}>Pass123!</code>
          </div>
        </div>
      </div>
    </main>
  );
}
