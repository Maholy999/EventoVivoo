'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardSession {
  id: string;
  title: string;
  location: string;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  attended_count: number;
  occupancy_rate: number;
  attendance_rate: number;
}

interface DashboardSurvey {
  total: number;
  average_rating: number;
  recent: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    session_title: string;
    attendee_name: string;
  }[];
}

export default function OrganizerDashboardPage() {
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [surveys, setSurveys] = useState<DashboardSurvey>({ total: 0, average_rating: 0, recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de check-in manual / lector
  const [checkInToken, setCheckInToken] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    status: 'recorded' | 'already_registered' | 'error';
    message: string;
    attendee?: { name: string; email: string; session: string };
    originalRecordedAt?: string;
  } | null>(null);

  const refreshDashboard = async () => {
    try {
      const res = await fetch('/api/organizer/dashboard');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setSurveys(data.surveys || { total: 0, average_rating: 0, recent: [] });
      }
    } catch {
      // Ignorar errores en refresh en segundo plano
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/organizer/dashboard');
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('403 Prohibido: Se requieren permisos de organizador para ver este panel.');
          }
          throw new Error('Error al cargar métricas del panel');
        }
        const data = await res.json();
        if (!ignore) {
          setSessions(data.sessions || []);
          setSurveys(data.surveys || { total: 0, average_rating: 0, recent: [] });
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError((err as Error).message || 'Error al conectar');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInToken.trim()) return;

    setCheckInLoading(true);
    setCheckInResult(null);

    try {
      const res = await fetch('/api/organizer/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: checkInToken.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCheckInResult({
          status: 'error',
          message: data.error || 'Código inválido o participante no confirmado',
        });
      } else {
        setCheckInResult({
          status: data.status,
          message: data.message,
          attendee: data.attendee,
          originalRecordedAt: data.original_recorded_at,
        });
        setCheckInToken('');
        // Recargar contadores del panel
        refreshDashboard();
      }
    } catch {
      setCheckInResult({
        status: 'error',
        message: 'Error de conexión al procesar el código',
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando métricas y aforos del organizador...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--accent-red)', borderRadius: '16px', padding: '30px' }}>
          <h2 className="font-display" style={{ color: 'var(--accent-red)', marginBottom: '12px' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>{error}</p>
          <Link href="/" className="btn-secondary">Volver a la Agenda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Cabecera del Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Consola de Control en Vivo
          </span>
          <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>
            Panel de Ocupación y Acreditación
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '2px' }}>
            Control en tiempo real de cupos, asistencia y resultados de satisfacción.
          </p>
        </div>

        {/* Botón Exportar CSV (F9) */}
        <a
          href="/api/organizer/export-csv"
          download="asistencia_eventovivo.csv"
          className="btn-primary"
          style={{ fontSize: '0.9rem', padding: '10px 18px' }}
        >
          📊 Exportar Asistencia (CSV)
        </a>
      </div>

      {/* Módulo de Check-in en Puerta (Idempotente R6 / R9) */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
            ⚡ Registro de Acceso en Puerta (Lector QR / Código Manual)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Ingresa el token de 32 caracteres del gafete o escanéalo con un lector de código de barras.
          </p>
        </div>

        <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Pegar o escanear token QR (ej: a1b2c3d4...)"
            value={checkInToken}
            onChange={(e) => setCheckInToken(e.target.value)}
            disabled={checkInLoading}
            style={{
              flex: '1 1 320px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--text-light)',
              fontSize: '0.95rem',
              fontFamily: 'monospace',
            }}
          />
          <button
            type="submit"
            disabled={checkInLoading || !checkInToken.trim()}
            className="btn-primary"
            style={{ padding: '12px 24px' }}
          >
            {checkInLoading ? 'Verificando...' : 'Validar Entrada'}
          </button>
        </form>

        {/* Resultado del Check-in */}
        {checkInResult && (
          <div
            role="status"
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '10px',
              background:
                checkInResult.status === 'recorded'
                  ? 'rgba(72, 229, 194, 0.15)'
                  : checkInResult.status === 'already_registered'
                  ? 'rgba(243, 156, 18, 0.15)'
                  : 'rgba(231, 76, 60, 0.15)',
              border: `1px solid ${
                checkInResult.status === 'recorded'
                  ? 'var(--primary)'
                  : checkInResult.status === 'already_registered'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-red)'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <strong
                style={{
                  color:
                    checkInResult.status === 'recorded'
                      ? 'var(--primary)'
                      : checkInResult.status === 'already_registered'
                      ? 'var(--accent-amber)'
                      : 'var(--accent-red)',
                  fontSize: '1rem',
                }}
              >
                {checkInResult.status === 'recorded' && '✓ ENTRADA REGISTRADA'}
                {checkInResult.status === 'already_registered' && '⚠️ ENTRADA YA REGISTRADA (IDEMPOTENTE)'}
                {checkInResult.status === 'error' && '✕ ACCESO DENEGADO'}
              </strong>
              {checkInResult.originalRecordedAt && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Primer ingreso: {new Date(checkInResult.originalRecordedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>{checkInResult.message}</p>

            {checkInResult.attendee && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                <strong>Asistente:</strong> {checkInResult.attendee.name} ({checkInResult.attendee.email}) &bull;{' '}
                <strong>Sesión:</strong> {checkInResult.attendee.session}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tarjetas Comparativas de Ocupación vs Asistencia */}
      <div style={{ marginBottom: '32px' }}>
        <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>
          Ocupación de Aforo vs. Asistencia Real en Sala
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                📍 {s.location || 'Auditorio Central'} &bull; Capacidad total: <strong>{s.capacity}</strong>
              </p>

              {/* Barra de Inscripción / Ocupación */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--primary)' }}>Inscritos Confirmados</span>
                  <strong>{s.confirmed_count} / {s.capacity} ({s.occupancy_rate}%)</strong>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, s.occupancy_rate)}%`,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
              </div>

              {/* Barra de Asistencia Real en Puerta */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--accent-amber)' }}>Asistencias Verificadas (QR)</span>
                  <strong>{s.attended_count} / {s.confirmed_count || 1} ({s.attendance_rate}%)</strong>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, s.attendance_rate)}%`,
                      background: 'var(--accent-amber)',
                    }}
                  />
                </div>
              </div>

              {/* Conteo de lista de espera */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                En lista de espera: <strong>{s.waitlist_count}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección de Encuestas de Satisfacción (R10) */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              Encuesta Breve de Satisfacción (R10)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Solo participantes con asistencia registrada pueden calificar.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              ⭐ {surveys.average_rating.toFixed(1)} / 5.0
            </span>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Basado en {surveys.total} respuestas
            </span>
          </div>
        </div>

        {surveys.recent.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            Aún no se han recibido encuestas para las sesiones actuales.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {surveys.recent.map((sv) => (
              <div
                key={sv.id}
                style={{
                  background: 'var(--bg-main)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      {'★'.repeat(sv.rating)}{'☆'.repeat(5 - sv.rating)}
                    </span>
                    <strong style={{ fontSize: '0.88rem' }}>{sv.session_title}</strong>
                  </div>
                  {sv.comment && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                      &ldquo;{sv.comment}&rdquo;
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {sv.attendee_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
