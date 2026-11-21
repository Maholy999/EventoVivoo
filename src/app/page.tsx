'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';

interface SessionItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  occupancy_state: 'disponible' | 'casi_llena' | 'llena';
  user_status: 'confirmed' | 'waitlisted' | null;
  enrollment_id: string | null;
  has_conflict: boolean;
  conflict_message: string | null;
}

interface NotificationItem {
  id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function AgendaPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'disponible' | 'enrolled'>('all');
  const [isPending, startTransition] = useTransition();

  const refreshAgenda = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch {
      // Ignorar errores en refresh
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) throw new Error('Error al conectar con la agenda');
        const data = await res.json();
        if (!ignore) {
          setSessions(data.sessions || []);
        }

        try {
          const notifRes = await fetch('/api/notifications');
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            if (!ignore) {
              setNotifications(notifData.notifications || []);
            }
          }
        } catch {
          // Ignorar si no está autenticado
        }
      } catch {
        if (!ignore) {
          setError('No se pudo cargar la agenda de sesiones. Por favor, revisa tu conexión o intenta más tarde.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleEnroll = async (sessionId: string) => {
    setFeedbackMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/enroll`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          setFeedbackMessage({ text: data.error || 'No se pudo realizar la inscripción', type: 'error' });
        } else {
          setFeedbackMessage({ text: data.message, type: 'success' });
          await refreshAgenda();
        }
      } catch {
        setFeedbackMessage({ text: 'Error de red al intentar inscribirse', type: 'error' });
      }
    });
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm('¿Seguro que deseas cancelar tu inscripción? Si tienes plaza confirmada, se promoverá a alguien de la lista de espera.')) {
      return;
    }
    setFeedbackMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/cancel`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          setFeedbackMessage({ text: data.error || 'Error al cancelar', type: 'error' });
        } else {
          setFeedbackMessage({ text: 'Inscripción cancelada exitosamente.', type: 'warning' });
          await refreshAgenda();
        }
      } catch {
        setFeedbackMessage({ text: 'Error de red al cancelar', type: 'error' });
      }
    });
  };

  const filteredSessions = sessions.filter((s) => {
    if (selectedFilter === 'disponible') return s.occupancy_state !== 'llena';
    if (selectedFilter === 'enrolled') return !!s.user_status;
    return true;
  });

  return (
    <div className="container">
      {/* Banner de Bandeja de Avisos F8 (si hay no leídos) */}
      {notifications.filter((n) => !n.read).length > 0 && (
        <section
          aria-label="Avisos importantes"
          style={{
            background: 'rgba(243, 156, 18, 0.1)',
            border: '1px solid var(--accent-amber)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: '1rem',
              color: 'var(--accent-amber)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📬 Avisos Importantes de tus Sesiones ({notifications.filter((n) => !n.read).length})
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications
              .filter((n) => !n.read)
              .map((notif) => (
                <li
                  key={notif.id}
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{notif.message}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Cabecera de la Agenda */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1
              className="font-display"
              style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-light)' }}
            >
              Línea de Tiempo del Evento
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>
              Talleres, hackatones y conferencias universitarias con control de cupos y acceso en vivo.
            </p>
          </div>

          {/* Filtros rápidos */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setSelectedFilter('all')}
              style={{
                background: selectedFilter === 'all' ? 'var(--primary)' : 'transparent',
                color: selectedFilter === 'all' ? 'var(--bg-main)' : 'var(--text-light)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: '6px',
              }}
            >
              Todas ({sessions.length})
            </button>
            <button
              onClick={() => setSelectedFilter('disponible')}
              style={{
                background: selectedFilter === 'disponible' ? 'var(--primary)' : 'transparent',
                color: selectedFilter === 'disponible' ? 'var(--bg-main)' : 'var(--text-light)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: '6px',
              }}
            >
              Con cupo
            </button>
            <button
              onClick={() => setSelectedFilter('enrolled')}
              style={{
                background: selectedFilter === 'enrolled' ? 'var(--primary)' : 'transparent',
                color: selectedFilter === 'enrolled' ? 'var(--bg-main)' : 'var(--text-light)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: '6px',
              }}
            >
              Mis Inscripciones
            </button>
          </div>
        </div>

        {/* Mensajes de feedback dinámicos */}
        {feedbackMessage && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.92rem',
              fontWeight: 500,
              background:
                feedbackMessage.type === 'success'
                  ? 'rgba(72, 229, 194, 0.15)'
                  : feedbackMessage.type === 'warning'
                  ? 'rgba(243, 156, 18, 0.15)'
                  : 'rgba(231, 76, 60, 0.15)',
              color:
                feedbackMessage.type === 'success'
                  ? 'var(--primary)'
                  : feedbackMessage.type === 'warning'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-red)',
              border: `1px solid ${
                feedbackMessage.type === 'success'
                  ? 'var(--primary)'
                  : feedbackMessage.type === 'warning'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-red)'
              }`,
            }}
          >
            {feedbackMessage.text}
          </div>
        )}
      </div>

      {/* Estado de Carga */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>Cargando sesiones y aforos en tiempo real...</p>
        </div>
      )}

      {/* Estado de Error */}
      {error && !loading && (
        <div
          role="alert"
          style={{
            background: 'rgba(231, 76, 60, 0.12)',
            border: '1px solid var(--accent-red)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--text-light)',
          }}
        >
          <p style={{ color: 'var(--accent-red)', fontWeight: 600, marginBottom: '12px' }}>{error}</p>
          <button onClick={() => { setLoading(true); refreshAgenda().finally(() => setLoading(false)); }} className="btn-secondary">
            Reintentar
          </button>
        </div>
      )}

      {/* Estado Vacío */}
      {!loading && !error && filteredSessions.length === 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
          }}
        >
          <h2 className="font-display" style={{ fontSize: '1.4rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            No hay sesiones para mostrar con este filtro
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Prueba seleccionando &quot;Todas&quot; para explorar el cronograma completo del evento.
          </p>
        </div>
      )}

      {/* Línea de tiempo de sesiones */}
      {!loading && !error && filteredSessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredSessions.map((session) => {
            const startDate = new Date(session.starts_at);
            const endDate = new Date(session.ends_at);
            const timeRangeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const dateStr = startDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

            return (
              <article
                key={session.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${session.user_status === 'confirmed' ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Cabecera de la tarjeta: Franja horaria y Semáforo de aforo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        background: 'var(--surface-card)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        textTransform: 'capitalize',
                      }}
                    >
                      📅 {dateStr}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>
                      ⏰ {timeRangeStr}
                    </span>
                  </div>

                  {/* Semáforo / Luz de escenario */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {session.occupancy_state === 'disponible' && (
                      <span className="stage-light stage-light-green">
                        Disponible ({session.capacity - session.confirmed_count} plazas libres)
                      </span>
                    )}
                    {session.occupancy_state === 'casi_llena' && (
                      <span className="stage-light stage-light-amber">
                        Casi llena ({session.capacity - session.confirmed_count} plazas libres)
                      </span>
                    )}
                    {session.occupancy_state === 'llena' && (
                      <span className="stage-light stage-light-red">
                        Aforo completo ({session.waitlist_count} en espera)
                      </span>
                    )}
                  </div>
                </div>

                {/* Título y detalles */}
                <div>
                  <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '6px' }}>
                    {session.title}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '8px' }}>
                    {session.description || 'Sin descripción detallada.'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    📍 <strong>Ubicación:</strong> {session.location || 'Auditorio Central'}
                  </p>
                </div>

                {/* Barra de progreso de aforo */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Ocupación de aforo</span>
                    <span>
                      {session.confirmed_count} / {session.capacity} inscritos ({Math.round((session.confirmed_count / Math.max(session.capacity, 1)) * 100)}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round((session.confirmed_count / Math.max(session.capacity, 1)) * 100))}%`,
                        background:
                          session.occupancy_state === 'llena'
                            ? 'var(--accent-red)'
                            : session.occupancy_state === 'casi_llena'
                            ? 'var(--accent-amber)'
                            : 'var(--primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Advertencia de traslape / choque de horario (R2 / R8) */}
                {session.has_conflict && !session.user_status && (
                  <div
                    style={{
                      background: 'rgba(231, 76, 60, 0.1)',
                      border: '1px solid rgba(231, 76, 60, 0.4)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--accent-red)',
                    }}
                  >
                    ⚠️ {session.conflict_message}
                  </div>
                )}

                {/* Estado del usuario y Botones de acción */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div>
                    {session.user_status === 'confirmed' && (
                      <span
                        style={{
                          background: 'rgba(72, 229, 194, 0.15)',
                          color: 'var(--primary)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        ✓ Inscripción Confirmada
                      </span>
                    )}
                    {session.user_status === 'waitlisted' && (
                      <span
                        style={{
                          background: 'rgba(243, 156, 18, 0.15)',
                          color: 'var(--accent-amber)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                        }}
                      >
                        ⏳ En Lista de Espera
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Botón Ver Credencial QR si está confirmado */}
                    {session.user_status === 'confirmed' && session.enrollment_id && (
                      <>
                        <Link
                          href={`/credential/${session.enrollment_id}`}
                          className="btn-primary"
                          style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                        >
                          🎟️ Ver Credencial QR
                        </Link>
                        <Link
                          href={`/survey/${session.enrollment_id}`}
                          className="btn-secondary"
                          style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                        >
                          ⭐ Responder Encuesta
                        </Link>
                        <button
                          onClick={() => handleCancel(session.id)}
                          disabled={isPending}
                          className="btn-danger"
                          style={{ fontSize: '0.85rem' }}
                        >
                          Cancelar plaza
                        </button>
                      </>
                    )}

                    {/* Botón salir de lista de espera */}
                    {session.user_status === 'waitlisted' && (
                      <button
                        onClick={() => handleCancel(session.id)}
                        disabled={isPending}
                        className="btn-danger"
                        style={{ fontSize: '0.85rem' }}
                      >
                        Salir de lista de espera
                      </button>
                    )}

                    {/* Botones de inscripción si no está registrado */}
                    {!session.user_status && (
                      <>
                        {session.occupancy_state !== 'llena' ? (
                          <button
                            onClick={() => handleEnroll(session.id)}
                            disabled={isPending || session.has_conflict}
                            className="btn-primary"
                            style={{
                              opacity: session.has_conflict ? 0.5 : 1,
                              cursor: session.has_conflict ? 'not-allowed' : 'pointer',
                              fontSize: '0.88rem',
                            }}
                          >
                            Inscribirme
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnroll(session.id)}
                            disabled={isPending || session.has_conflict}
                            className="btn-secondary"
                            style={{
                              borderColor: 'var(--accent-amber)',
                              color: 'var(--accent-amber)',
                              fontSize: '0.88rem',
                            }}
                          >
                            Entrar a Lista de Espera
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
