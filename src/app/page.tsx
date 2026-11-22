'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { SegmentedMeter } from './components/SegmentedMeter';

interface SessionItem {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_count: number;
  free_slots: number;
  waitlist_count: number;
  occupancy_state: 'disponible' | 'casi_llena' | 'llena';
  organizer_name: string;
  user_status: 'confirmed' | 'waitlisted' | null;
  enrollment_id: string | null;
  has_attended: boolean;
  survey_submitted: boolean;
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

interface CurrentUser {
  id: string;
  name: string;
  role: 'participant' | 'organizer';
}

export default function HomePage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  // Filtros del Catálogo (F10)
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedDate, setSelectedDate] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'catalogo' | 'programa'>('catalogo');

  // Detalle de Sesión (F11)
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);

  const [, startTransition] = useTransition();

  const loadData = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Error al conectar con el catálogo de eventos');
      const data = await res.json();
      setSessions(data.sessions || []);
      setCurrentUser(data.currentUser || null);

      if (data.currentUser && data.currentUser.role !== 'organizer') {
        const notifRes = await fetch('/api/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData.notifications || []);
        }
      }
    } catch {
      setError('No se pudo cargar el programa. Por favor, revisa la conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (sessionId: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/enroll`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ text: data.error || 'No se pudo completar la inscripción', type: 'err' });
      } else {
        setFeedback({ text: data.message, type: 'ok' });
        await loadData();
        if (selectedSession && selectedSession.id === sessionId) {
          // Actualizar modal
          const updated = sessions.find((s) => s.id === sessionId);
          if (updated) setSelectedSession(updated);
        }
      }
    } catch {
      setFeedback({ text: 'Error de red al inscribirse', type: 'err' });
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm('¿Deseas cancelar tu plaza? Si estás confirmado, se promoverá automáticamente al primer participante en espera.')) {
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ text: data.error || 'Error al cancelar', type: 'err' });
      } else {
        setFeedback({ text: 'Inscripción cancelada exitosamente.', type: 'ok' });
        await loadData();
        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch {
      setFeedback({ text: 'Error de red al cancelar', type: 'err' });
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getDateKey = (iso: string) => {
    return new Date(iso).toISOString().slice(0, 10);
  };

  // Fechas únicas disponibles en las sesiones
  const availableDates = Array.from(new Set(sessions.map((s) => getDateKey(s.starts_at)))).sort();

  // Filtrado de sesiones (F10)
  const filteredSessions = sessions.filter((s) => {
    if (selectedType !== 'todos' && s.type.toLowerCase() !== selectedType.toLowerCase()) return false;
    if (selectedDate !== 'todas' && getDateKey(s.starts_at) !== selectedDate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q) ?? false;
      const matchLoc = s.location?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }
    return true;
  });

  // Sesiones en las que el usuario está inscrito o en espera
  const myConfirmedSessions = sessions.filter((s) => s.user_status === 'confirmed');
  const myWaitlistedSessions = sessions.filter((s) => s.user_status === 'waitlisted');

  if (loading) {
    return (
      <main className="container" style={{ padding: '40px 16px' }}>
        <div style={{ height: '28px', width: '240px', backgroundColor: '#DDD7CC', marginBottom: '16px' }} />
        <div style={{ height: '140px', backgroundColor: '#F6F3EE', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '180px', backgroundColor: '#F6F3EE', border: '1px solid #DDD7CC' }} />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p style={{ color: '#E8440F', fontSize: '16px' }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '24px 16px 80px' }}>
      {/* BANNER AVISOS PARTICIPANTE (F8) */}
      {currentUser && currentUser.role !== 'organizer' && notifications.filter((n) => !n.read).length > 0 && (
        <section
          id="avisos"
          aria-label="Avisos importantes"
          style={{
            border: '2px solid #E8440F',
            backgroundColor: '#FFF8F6',
            padding: '14px 18px',
            marginBottom: '24px',
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#E8440F',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '8px', height: '8px', backgroundColor: '#E8440F', borderRadius: '50%' }} />
            Avisos de tus sesiones ({notifications.filter((n) => !n.read).length})
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {notifications
              .filter((n) => !n.read)
              .map((notif) => (
                <li
                  key={notif.id}
                  style={{
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderBottom: '1px solid #FCE4DC',
                    paddingBottom: '4px',
                  }}
                >
                  <span>{notif.message}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F' }}>
                    {formatTime(notif.created_at)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* FEEDBACK MENSAJE ACCIÓN */}
      {feedback && (
        <div
          style={{
            padding: '10px 16px',
            marginBottom: '20px',
            border: `1px solid ${feedback.type === 'ok' ? '#1E6B4F' : '#E8440F'}`,
            backgroundColor: feedback.type === 'ok' ? '#F4FBF7' : '#FFF5F2',
            color: feedback.type === 'ok' ? '#1E6B4F' : '#E8440F',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            ✕
          </button>
        </div>
      )}

      {/* SECCIÓN "MIS INSCRIPCIONES" (Si el participante tiene actividades) */}
      {currentUser && currentUser.role !== 'organizer' && (myConfirmedSessions.length > 0 || myWaitlistedSessions.length > 0) && (
        <section
          id="mis-inscripciones"
          style={{
            border: '2px solid #16130F',
            backgroundColor: '#F6F3EE',
            padding: '20px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Mis inscripciones</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#5E584F' }}>
              {myConfirmedSessions.length} confirmadas · {myWaitlistedSessions.length} en espera
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {myConfirmedSessions.map((s) => (
              <div
                key={`my-conf-${s.id}`}
                style={{
                  border: '1px solid #16130F',
                  borderLeft: '5px solid #E8440F',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="tag-inscrito">INSCRITO</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F' }}>
                    {formatTime(s.starts_at)} - {formatTime(s.ends_at)}
                  </span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '4px 0 6px' }}>{s.title}</h4>
                <div style={{ fontSize: '11px', color: '#5E584F', marginBottom: '10px' }}>
                  📍 {s.location || 'Sin sala'} · {formatDate(s.starts_at)}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid #EEE', paddingTop: '8px' }}>
                  <Link
                    href={`/credential/${s.enrollment_id}`}
                    className="btn-tinta"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Ver Credencial QR →
                  </Link>

                  {/* R18: La encuesta SOLO se ofrece a quien tiene asistencia registrada */}
                  {s.has_attended && !s.survey_submitted && (
                    <Link
                      href={`/survey/${s.enrollment_id}`}
                      className="btn-senal"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      ⭐ Responder encuesta
                    </Link>
                  )}

                  {s.survey_submitted && (
                    <span style={{ fontSize: '11px', color: '#1E6B4F', fontWeight: 600, padding: '4px 6px' }}>
                      ✓ Encuesta enviada
                    </span>
                  )}

                  <button
                    onClick={() => handleCancel(s.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#E8440F',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      marginLeft: 'auto',
                    }}
                  >
                    Cancelar plaza
                  </button>
                </div>
              </div>
            ))}

            {myWaitlistedSessions.map((s) => (
              <div
                key={`my-wait-${s.id}`}
                style={{
                  border: '1px dashed #5E584F',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="tag-espera">EN ESPERA</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F' }}>
                    {formatTime(s.starts_at)}
                  </span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '4px 0 6px' }}>{s.title}</h4>
                <div style={{ fontSize: '11px', color: '#5E584F', marginBottom: '10px' }}>
                  Aviso: si se libera un cupo, ascenderás automáticamente.
                </div>
                <div style={{ textAlign: 'right', borderTop: '1px solid #EEE', paddingTop: '8px' }}>
                  <button
                    onClick={() => handleCancel(s.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#E8440F',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Salir de la lista de espera
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PORTADA Y CATÁLOGO DE EVENTOS (F10) */}
      <section>
        {/* Cabecera del Catálogo */}
        <div style={{ borderBottom: '2px solid #16130F', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Catálogo Abierto al Público
              </span>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '2px 0 4px', letterSpacing: '-0.02em' }}>
                Explorar eventos
              </h1>
              <p style={{ color: '#5E584F', fontSize: '14px', margin: 0 }}>
                Programa impreso oficial de encuentros, talleres, hackatones y conferencias universitarias en vivo.
              </p>
            </div>

            {/* Alternador de vista: Catálogo vs Programa del día */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setActiveView('catalogo')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #16130F',
                  background: activeView === 'catalogo' ? '#16130F' : '#FFFFFF',
                  color: activeView === 'catalogo' ? '#FFFFFF' : '#16130F',
                  borderRadius: '2px',
                }}
              >
                Vista Catálogo
              </button>
              <button
                id="programa"
                onClick={() => setActiveView('programa')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #16130F',
                  background: activeView === 'programa' ? '#16130F' : '#FFFFFF',
                  color: activeView === 'programa' ? '#FFFFFF' : '#16130F',
                  borderRadius: '2px',
                }}
              >
                Programa del día (Horario)
              </button>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda (F10) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginTop: '16px',
              background: '#F6F3EE',
              padding: '12px',
              border: '1px solid #DDD7CC',
            }}
          >
            {/* Búsqueda por texto */}
            <div style={{ flex: '1 1 220px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, tema o sala…"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #16130F',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {/* Filtro por tipo de evento */}
            <div style={{ minWidth: '150px' }}>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #16130F',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="todos">Todos los tipos</option>
                <option value="taller">Talleres</option>
                <option value="hackatón">Hackatones</option>
                <option value="conferencia">Conferencias</option>
                <option value="encuentro">Encuentros</option>
              </select>
            </div>

            {/* Filtro por fecha */}
            {availableDates.length > 1 && (
              <div style={{ minWidth: '140px' }}>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #16130F',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="todas">Todas las fechas</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(searchQuery || selectedType !== 'todos' || selectedDate !== 'todas') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('todos');
                  setSelectedDate('todas');
                }}
                style={{
                  background: 'none',
                  border: '1px solid #DDD7CC',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#5E584F',
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* VISTA 1: CATÁLOGO DE TARJETAS TIPO PROGRAMA */}
        {activeView === 'catalogo' && (
          <div>
            {filteredSessions.length === 0 ? (
              <div style={{ padding: '60px 16px', textAlign: 'center', border: '1px solid #DDD7CC', background: '#F6F3EE' }}>
                <p style={{ color: '#5E584F', fontSize: '15px' }}>
                  No se encontraron sesiones con los filtros seleccionados.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '16px',
                }}
              >
                {filteredSessions.map((s) => {
                  const isUserConfirmed = s.user_status === 'confirmed';
                  const isUserWaitlisted = s.user_status === 'waitlisted';

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      style={{
                        border: '1px solid #16130F',
                        borderLeft: isUserConfirmed
                          ? '6px solid #E8440F'
                          : s.occupancy_state === 'llena'
                          ? '6px solid #16130F'
                          : s.occupancy_state === 'casi_llena'
                          ? '6px solid #B7700B'
                          : '6px solid #1E6B4F',
                        padding: '16px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {/* Estado según las reglas exactas de Dirección de Arte */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {isUserConfirmed ? (
                              <span className="tag-inscrito">INSCRITO</span>
                            ) : isUserWaitlisted ? (
                              <span className="tag-espera">EN ESPERA</span>
                            ) : s.occupancy_state === 'llena' ? (
                              <span className="tag-llena">LLENA · espera {s.waitlist_count}</span>
                            ) : s.occupancy_state === 'casi_llena' ? (
                              <span className="tag-casi-llena">ÚLTIMOS {s.free_slots} CUPOS</span>
                            ) : (
                              <span className="tag-disponible">DISPONIBLE · {s.free_slots} libres</span>
                            )}
                          </div>

                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              color: '#5E584F',
                            }}
                          >
                            {s.type}
                          </span>
                        </div>

                        {/* Hora y ubicación en mono */}
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: '#16130F',
                            fontWeight: 600,
                            marginBottom: '6px',
                          }}
                        >
                          {formatDate(s.starts_at)} · {formatTime(s.starts_at)} - {formatTime(s.ends_at)}
                        </div>

                        {/* Título de la sesión */}
                        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>
                          {s.title}
                        </h3>

                        {/* Ubicación y organizador */}
                        <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '12px' }}>
                          📍 {s.location || 'Sala por confirmar'} · Organiza: {s.organizer_name}
                        </div>

                        {/* Breve descripción */}
                        {s.description && (
                          <p style={{ fontSize: '13px', color: '#5E584F', lineHeight: 1.4, margin: '0 0 14px' }}>
                            {s.description.length > 110 ? `${s.description.slice(0, 110)}…` : s.description}
                          </p>
                        )}
                      </div>

                      {/* Barra de aforo segmentada y botón de acción */}
                      <div style={{ borderTop: '1px solid #DDD7CC', paddingTop: '10px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#5E584F', textDecoration: 'underline' }}>
                            Ver detalle completo →
                          </span>

                          {!currentUser ? (
                            <Link
                              href="/login"
                              onClick={(e) => e.stopPropagation()}
                              className="btn-outline"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                            >
                              Iniciar sesión para inscribirme
                            </Link>
                          ) : currentUser.role === 'organizer' ? (
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#5E584F' }}>
                              Modo Organizador (R13)
                            </span>
                          ) : isUserConfirmed ? (
                            <span style={{ fontSize: '11px', color: '#1E6B4F', fontWeight: 600 }}>
                              ✓ Confirmado
                            </span>
                          ) : isUserWaitlisted ? (
                            <span style={{ fontSize: '11px', color: '#5E584F', fontWeight: 600 }}>
                              En lista de espera
                            </span>
                          ) : s.has_conflict ? (
                            <span style={{ fontSize: '11px', color: '#B7700B', fontWeight: 600 }} title={s.conflict_message || ''}>
                              ⚠️ Choque de horario
                            </span>
                          ) : s.occupancy_state === 'llena' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnroll(s.id);
                              }}
                              className="btn-tinta"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                            >
                              Entrar en espera
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnroll(s.id);
                              }}
                              className="btn-senal"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                            >
                              Inscribirme
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: "PROGRAMA DEL DÍA" (Columnas por horario y bloques por sala) */}
        {activeView === 'programa' && (
          <div style={{ border: '2px solid #16130F', background: '#FFFFFF' }}>
            <div style={{ padding: '12px 16px', background: '#F6F3EE', borderBottom: '1px solid #DDD7CC' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                Programa impreso oficial ordenado cronológicamente
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #DDD7CC', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', width: '160px' }}>HORA</th>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', width: '180px' }}>UBICACIÓN</th>
                    <th style={{ padding: '10px 14px' }}>SESIÓN Y ORGANIZADOR</th>
                    <th style={{ padding: '10px 14px', width: '200px' }}>ESTADO Y AFORO</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>DETALLE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((s, idx) => (
                    <tr
                      key={`prog-${s.id}`}
                      style={{
                        borderBottom: '1px solid #EEE9DF',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700 }}>{formatTime(s.starts_at)} - {formatTime(s.ends_at)}</div>
                        <div style={{ fontSize: '11px', color: '#5E584F' }}>{formatDate(s.starts_at)}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                        📍 {s.location || 'Sala por confirmar'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                        <div style={{ fontSize: '11px', color: '#5E584F' }}>
                          <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{s.type}</span> · Organiza: {s.organizer_name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedSession(s)}
                          style={{
                            padding: '4px 10px',
                            background: '#16130F',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* MODAL DETALLE DE SESIÓN (F11) */}
      {selectedSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 19, 15, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #16130F',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Detalle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: '#5E584F' }}>
                  {selectedSession.type} · Organizado por {selectedSession.organizer_name}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0', lineHeight: 1.3 }}>
                  {selectedSession.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  background: 'none',
                  border: '1px solid #16130F',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* Metadatos en formato programa impreso */}
            <div
              style={{
                backgroundColor: '#F6F3EE',
                border: '1px solid #DDD7CC',
                padding: '12px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: '#5E584F', display: 'block' }}>Horario:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatDate(selectedSession.starts_at)} {formatTime(selectedSession.starts_at)} - {formatTime(selectedSession.ends_at)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#5E584F', display: 'block' }}>Ubicación:</span>
                <strong>{selectedSession.location || 'Sala por confirmar'}</strong>
              </div>
              <div>
                <span style={{ color: '#5E584F', display: 'block' }}>Cupo total:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedSession.capacity} plazas</strong>
              </div>
              <div>
                <span style={{ color: '#5E584F', display: 'block' }}>Disponibilidad:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  {selectedSession.free_slots > 0 ? `${selectedSession.free_slots} libres` : `Agotado (Espera: ${selectedSession.waitlist_count})`}
                </strong>
              </div>
            </div>

            {/* Barra de aforo segmentada */}
            <div style={{ marginBottom: '16px' }}>
              <SegmentedMeter
                capacity={selectedSession.capacity}
                confirmed={selectedSession.confirmed_count}
                waitlisted={selectedSession.waitlist_count}
              />
            </div>

            {/* Descripción completa */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', color: '#5E584F' }}>
                Descripción de la sesión
              </h4>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#16130F', margin: 0 }}>
                {selectedSession.description || 'Sin descripción detallada proporcionada por el organizador.'}
              </p>
            </div>

            {/* Advertencia de conflicto si aplica */}
            {selectedSession.has_conflict && (
              <div
                style={{
                  border: '1px solid #B7700B',
                  backgroundColor: '#FFFDF0',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#B7700B',
                }}
              >
                ⚠️ <strong>Aviso de traslape:</strong> {selectedSession.conflict_message}
              </div>
            )}

            {/* Acciones según el rol y estado (R13, R18, F11) */}
            <div style={{ borderTop: '1px solid #16130F', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {!currentUser ? (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <Link
                    href="/login"
                    className="btn-senal"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Iniciar sesión para inscribirme
                  </Link>
                </div>
              ) : currentUser.role === 'organizer' ? (
                <div style={{ width: '100%', fontSize: '12px', color: '#5E584F', background: '#F6F3EE', padding: '10px', textAlign: 'center' }}>
                  Eres Organizador. Las inscripciones y cancelaciones son exclusivas para participantes (R13).
                </div>
              ) : selectedSession.user_status === 'confirmed' ? (
                <>
                  <Link
                    href={`/credential/${selectedSession.enrollment_id}`}
                    className="btn-tinta"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    Ver Credencial QR →
                  </Link>

                  {/* R18: La encuesta solo se ofrece a quien asistió físicamente */}
                  {selectedSession.has_attended && !selectedSession.survey_submitted && (
                    <Link
                      href={`/survey/${selectedSession.enrollment_id}`}
                      className="btn-senal"
                      style={{ fontSize: '12px', padding: '8px 14px' }}
                    >
                      ⭐ Responder encuesta
                    </Link>
                  )}

                  <button
                    onClick={() => handleCancel(selectedSession.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #E8440F',
                      color: '#E8440F',
                      fontSize: '12px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    Cancelar plaza
                  </button>
                </>
              ) : selectedSession.user_status === 'waitlisted' ? (
                <>
                  <span style={{ fontSize: '12px', color: '#5E584F', fontFamily: 'var(--font-mono)' }}>
                    Registrado en lista de espera
                  </span>
                  <button
                    onClick={() => handleCancel(selectedSession.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #E8440F',
                      color: '#E8440F',
                      fontSize: '12px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    Salir de la lista de espera
                  </button>
                </>
              ) : selectedSession.occupancy_state === 'llena' ? (
                <button
                  onClick={() => handleEnroll(selectedSession.id)}
                  className="btn-tinta"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Entrar en lista de espera (Puesto #{selectedSession.waitlist_count + 1})
                </button>
              ) : (
                <button
                  onClick={() => handleEnroll(selectedSession.id)}
                  className="btn-senal"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Inscribirme ahora ({selectedSession.free_slots} plazas libres)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
