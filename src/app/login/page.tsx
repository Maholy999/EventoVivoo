'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'participant' | 'organizer'>('participant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { email, password, name, role }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error');
      } else {
        if (isRegister) {
          // Iniciar sesión automáticamente tras registro
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
            setError('Usuario registrado. Por favor inicia sesión.');
          }
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch {
      setError('Error de conexión al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', padding: '40px 20px' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {isRegister ? 'Registro en EventoVivo' : 'Acceso al Campus'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            {isRegister
              ? 'Crea tu cuenta para inscribirte o gestionar eventos'
              : 'Ingresa con tu correo y contraseña institucional'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(231, 76, 60, 0.15)',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
              fontSize: '0.88rem',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sofia Reyes"
                style={{
                  width: '100%',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-light)',
                  fontSize: '0.92rem',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@universidad.edu"
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-light)',
                fontSize: '0.92rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-light)',
                fontSize: '0.92rem',
              }}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Tipo de Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'participant' | 'organizer')}
                style={{
                  width: '100%',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-light)',
                  fontSize: '0.92rem',
                }}
              >
                <option value="participant">Participante (estudiante, docente)</option>
                <option value="organizer">Organizador (control de aforo y asistencia)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.95rem' }}
          >
            {loading ? 'Procesando...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{
              background: 'transparent',
              color: 'var(--primary)',
              fontSize: '0.88rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}
