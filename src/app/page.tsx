'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { SegmentedMeter } from './components/SegmentedMeter';
import { getSessionImage } from '@/lib/eventImages';

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
  user_status: 'confirmed' | 'waitlisted' | 'pending' | null;
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

  // Filtros del Catálogo
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedDate, setSelectedDate] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'tarjetas' | 'cronograma'>('tarjetas');

  // Detalle de Sesión interactivo
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);

  // Modal propio de confirmación de cancelación (sin alert/confirm tipo localhost)
  const [sessionToCancel, setSessionToCancel] = useState<SessionItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Modal rápido de Credencial QR instantánea
  const [credentialModalSession, setCredentialModalSession] = useState<SessionItem | null>(null);

  // Modal rápido de Encuesta de satisfacción
  const [surveyModalSession, setSurveyModalSession] = useState<SessionItem | null>(null);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyComment, setSurveyComment] = useState('');
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

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
          const updated = sessions.find((s) => s.id === sessionId);
          if (updated) setSelectedSession(updated);
        }
      }
    } catch {
      setFeedback({ text: 'Error de red al inscribirse', type: 'err' });
    }
  };

  const executeCancel = async () => {
    if (!sessionToCancel) return;
    setCancelling(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/sessions/${sessionToCancel.id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ text: data.error || 'Error al cancelar la plaza', type: 'err' });
      } else {
        setFeedback({ text: 'Plaza liberada correctamente. Gracias por avisar con tiempo.', type: 'ok' });
        setSessionToCancel(null);
        if (selectedSession && selectedSession.id === sessionToCancel.id) {
          setSelectedSession(null);
        }
        await loadData();
      }
    } catch {
      setFeedback({ text: 'Error de conexión al procesar la cancelación', type: 'err' });
    } finally {
      setCancelling(false);
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyModalSession || !surveyModalSession.enrollment_id) return;
    setSubmittingSurvey(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: surveyModalSession.enrollment_id,
          rating: surveyRating,
          comment: surveyComment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ text: data.error || 'No se pudo registrar la encuesta', type: 'err' });
      } else {
        setFeedback({ text: '¡Muchas gracias por tu valoración!', type: 'ok' });
        setSurveyModalSession(null);
        setSurveyComment('');
        await loadData();
      }
    } catch {
      setFeedback({ text: 'Error de red al enviar la encuesta', type: 'err' });
    } finally {
      setSubmittingSurvey(false);
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

  const availableDates = Array.from(new Set(sessions.map((s) => getDateKey(s.starts_at)))).sort();

  const filteredSessions = sessions.filter((s) => {
    if (selectedType !== 'todos' && s.type.toLowerCase() !== selectedType.toLowerCase()) return false;
    if (selectedDate !== 'todas' && getDateKey(s.starts_at) !== selectedDate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q) ?? false;
      const matchLoc = s.location?.toLowerCase().includes(q) ?? false;
      const matchOrg = s.organizer_name?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc && !matchLoc && !matchOrg) return false;
    }
    return true;
  });

  const myConfirmedSessions = sessions.filter((s) => s.user_status === 'confirmed');
  const myWaitlistedSessions = sessions.filter((s) => s.user_status === 'waitlisted');
  const myPendingSessions = sessions.filter((s) => s.user_status === 'pending');

  if (loading) {
    return (
      <main className="container" style={{ padding: '40px 16px' }}>
        <div style={{ height: '28px', width: '240px', backgroundColor: '#DDD7CC', marginBottom: '16px' }} />
        <div style={{ height: '140px', backgroundColor: '#F6F3EE', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '260px', backgroundColor: '#F6F3EE', border: '1px solid #DDD7CC' }} />
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
      {/* BARRA DESTACADA SI ES ORGANIZADOR */}
      {currentUser && currentUser.role === 'organizer' && (
        <section
          style={{
            backgroundColor: '#F6F3EE',
            border: '2px solid #16130F',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', fontWeight: 700 }}>
              Modo Organizador Activo
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
              Estás visualizando el catálogo tal como lo ven los participantes.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link
              href="/organizer?tab=mis_sesiones&create=true"
              style={{
                backgroundColor: 'var(--senal)',
                color: '#FFFFFF',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              + Crear nueva sesión
            </Link>
            <Link
              href="/organizer"
              style={{
                backgroundColor: '#16130F',
                color: '#FFFFFF',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '2px',
              }}
            >
              Ir a mi Panel de Control →
            </Link>
          </div>
        </section>
      )}

      {/* BANNER AVISOS PARTICIPANTE */}
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
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, padding: 0 }}>
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
            padding: '12px 16px',
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
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
            ✕
          </button>
        </div>
      )}

      {/* SECCIÓN "MIS INSCRIPCIONES" (Si el participante tiene actividades) */}
      {currentUser && currentUser.role !== 'organizer' && (myConfirmedSessions.length > 0 || myWaitlistedSessions.length > 0 || myPendingSessions.length > 0) && (
        <section
          id="mis-inscripciones"
          style={{
            border: '2px solid #16130F',
            backgroundColor: '#F6F3EE',
            padding: '20px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Mis inscripciones</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#5E584F' }}>
              {myConfirmedSessions.length} confirmadas · {myWaitlistedSessions.length} en espera {myPendingSessions.length > 0 ? `· ${myPendingSessions.length} pendientes` : ''}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {/* Confirmadas */}
            {myConfirmedSessions.map((s) => {
              const img = getSessionImage(s.type, s.title, s.id);
              return (
                <div
                  key={`my-conf-${s.id}`}
                  style={{
                    border: '1px solid #16130F',
                    borderLeft: '6px solid #E8440F',
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ height: '90px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={img.url}
                      alt={img.alt}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                      <span className="tag-inscrito">INSCRITO CONFIRMADO</span>
                    </div>
                  </div>

                  <div style={{ padding: '14px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#16130F', fontWeight: 600, marginBottom: '4px' }}>
                      {formatDate(s.starts_at)} · {formatTime(s.starts_at)} - {formatTime(s.ends_at)}
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 6px', lineHeight: 1.3 }}>{s.title}</h4>
                    <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '12px' }}>
                      📍 {s.location || 'Sala por confirmar'}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid #EEE', paddingTop: '10px', alignItems: 'center' }}>
                      <button
                        onClick={() => setCredentialModalSession(s)}
                        className="btn-tinta"
                        style={{ fontSize: '11px', padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Ver Credencial QR →
                      </button>

                      {/* Encuesta solo si asistió físicamente */}
                      {s.has_attended && !s.survey_submitted && (
                        <button
                          onClick={() => setSurveyModalSession(s)}
                          className="btn-senal"
                          style={{ fontSize: '11px', padding: '6px 12px', cursor: 'pointer' }}
                        >
                          ⭐ Responder encuesta
                        </button>
                      )}

                      {s.survey_submitted && (
                        <span style={{ fontSize: '11px', color: '#1E6B4F', fontWeight: 600, padding: '4px 6px' }}>
                          ✓ Encuesta respondida
                        </span>
                      )}

                      <button
                        onClick={() => setSessionToCancel(s)}
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
                </div>
              );
            })}

            {/* En Lista de Espera */}
            {myWaitlistedSessions.map((s) => (
              <div
                key={`my-wait-${s.id}`}
                style={{
                  border: '1px dashed #5E584F',
                  padding: '14px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="tag-espera">EN LISTA DE ESPERA</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F' }}>
                      {formatTime(s.starts_at)}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '4px 0 6px' }}>{s.title}</h4>
                  <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '10px' }}>
                    📍 {s.location || 'Sala por confirmar'} · Si alguien cancela, tu plaza se confirmará automáticamente.
                  </div>
                </div>
                <div style={{ textAlign: 'right', borderTop: '1px solid #EEE', paddingTop: '8px' }}>
                  <button
                    onClick={() => setSessionToCancel(s)}
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

            {/* Pendientes de Aprobación */}
            {myPendingSessions.map((s) => (
              <div
                key={`my-pend-${s.id}`}
                style={{
                  border: '1px dotted #B7700B',
                  padding: '14px',
                  backgroundColor: '#FFFDF9',
                }}
              >
                <span style={{ backgroundColor: '#B7700B', color: '#FFFFFF', padding: '2px 8px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  SOLICITUD EN REVISIÓN
                </span>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '6px 0 4px' }}>{s.title}</h4>
                <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '8px' }}>
                  El organizador revisará tu solicitud antes de asignar el cupo.
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PORTADA Y EXPLORADOR DE EVENTOS */}
      <section>
        <div style={{ borderBottom: '2px solid #16130F', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Catálogo Universitario Oficial
              </span>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '2px 0 4px', letterSpacing: '-0.02em' }}>
                Explorar eventos
              </h1>
              <p style={{ color: '#5E584F', fontSize: '14px', margin: 0 }}>
                Talleres, hackatones, conferencias magistrales y encuentros en vivo con control inteligente de aforo.
              </p>
            </div>

            {/* Conmutador de Vista */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setActiveView('tarjetas')}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #16130F',
                  background: activeView === 'tarjetas' ? '#16130F' : '#FFFFFF',
                  color: activeView === 'tarjetas' ? '#FFFFFF' : '#16130F',
                  borderRadius: '2px',
                }}
              >
                Vista Tarjetas
              </button>
              <button
                onClick={() => setActiveView('cronograma')}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #16130F',
                  background: activeView === 'cronograma' ? '#16130F' : '#FFFFFF',
                  color: activeView === 'cronograma' ? '#FFFFFF' : '#16130F',
                  borderRadius: '2px',
                }}
              >
                Vista Cronograma
              </button>
            </div>
          </div>

          {/* BUSCADOR PROMINENTE Y FILTROS */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '18px',
              background: '#F6F3EE',
              padding: '14px',
              border: '1px solid #DDD7CC',
              alignItems: 'center',
            }}
          >
            {/* Buscador de texto libre */}
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar por nombre, tema, expositor o sala…"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #16130F',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filtro por tipo */}
            <div style={{ minWidth: '160px' }}>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #16130F',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="todos">Todos los formatos</option>
                <option value="taller">Talleres</option>
                <option value="hackatón">Hackatones</option>
                <option value="conferencia">Conferencias</option>
                <option value="encuentro">Encuentros</option>
              </select>
            </div>

            {/* Filtro por fecha */}
            {availableDates.length > 1 && (
              <div style={{ minWidth: '150px' }}>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
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
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#5E584F',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        </div>

        {/* VISTA 1: TARJETAS VISUALES CON IMAGEN */}
        {activeView === 'tarjetas' && (
          <div>
            {filteredSessions.length === 0 ? (
              <div style={{ padding: '60px 16px', textAlign: 'center', border: '1px solid #DDD7CC', background: '#F6F3EE' }}>
                <p style={{ color: '#5E584F', fontSize: '15px', margin: '0 0 10px' }}>
                  No se encontraron eventos con los criterios de búsqueda.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedType('todos'); setSelectedDate('todas'); }}
                  style={{ background: '#16130F', color: '#FFF', border: 'none', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Ver todos los eventos
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '20px',
                }}
              >
                {filteredSessions.map((s) => {
                  const isUserConfirmed = s.user_status === 'confirmed';
                  const isUserWaitlisted = s.user_status === 'waitlisted';
                  const isUserPending = s.user_status === 'pending';
                  const img = getSessionImage(s.type, s.title, s.id);

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
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      {/* Imagen Temática del Evento */}
                      <div style={{ height: '140px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                        <img
                          src={img.url}
                          alt={img.alt}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                          {isUserConfirmed ? (
                            <span className="tag-inscrito">INSCRITO</span>
                          ) : isUserWaitlisted ? (
                            <span className="tag-espera">EN ESPERA</span>
                          ) : isUserPending ? (
                            <span style={{ backgroundColor: '#B7700B', color: '#FFF', fontSize: '10px', fontWeight: 700, padding: '3px 8px' }}>
                              PENDIENTE
                            </span>
                          ) : s.occupancy_state === 'llena' ? (
                            <span className="tag-llena">LLENA · espera {s.waitlist_count}</span>
                          ) : s.occupancy_state === 'casi_llena' ? (
                            <span className="tag-casi-llena">ÚLTIMOS {s.free_slots} CUPOS</span>
                          ) : (
                            <span className="tag-disponible">DISPONIBLE · {s.free_slots} libres</span>
                          )}
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(22, 19, 15, 0.85)',
                            color: '#FFFFFF',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            textTransform: 'uppercase',
                            borderRadius: '2px',
                          }}
                        >
                          {s.type}
                        </div>
                      </div>

                      {/* Cuerpo de la tarjeta */}
                      <div style={{ padding: '16px' }}>
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

                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>
                          {s.title}
                        </h3>

                        <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '10px' }}>
                          📍 {s.location || 'Sala por confirmar'} · Organiza: <strong>{s.organizer_name}</strong>
                        </div>

                        {s.description && (
                          <p style={{ fontSize: '13px', color: '#5E584F', lineHeight: 1.4, margin: '0 0 14px' }}>
                            {s.description.length > 120 ? `${s.description.slice(0, 120)}…` : s.description}
                          </p>
                        )}

                        {/* Barra de aforo segmentada */}
                        <div style={{ borderTop: '1px solid #DDD7CC', paddingTop: '10px', marginTop: '10px' }}>
                          <div style={{ marginBottom: '10px' }}>
                            <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#5E584F', textDecoration: 'underline' }}>
                              Ver más información →
                            </span>

                            {!currentUser ? (
                              <Link
                                href="/login"
                                onClick={(e) => e.stopPropagation()}
                                className="btn-outline"
                                style={{ fontSize: '11px', padding: '5px 10px' }}
                              >
                                Iniciar sesión
                              </Link>
                            ) : currentUser.role === 'organizer' ? (
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#5E584F' }}>
                                Vista previa
                              </span>
                            ) : isUserConfirmed ? (
                              <span style={{ fontSize: '11px', color: '#1E6B4F', fontWeight: 600 }}>
                                ✓ Tu lugar está confirmado
                              </span>
                            ) : isUserWaitlisted ? (
                              <span style={{ fontSize: '11px', color: '#5E584F', fontWeight: 600 }}>
                                En lista de espera
                              </span>
                            ) : s.has_conflict ? (
                              <span
                                style={{ fontSize: '11px', color: '#B7700B', fontWeight: 600 }}
                                title={s.conflict_message || 'Coincide con otra sesión en la que estás confirmado'}
                              >
                                ⚠️ Choque de horario
                              </span>
                            ) : s.occupancy_state === 'llena' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnroll(s.id);
                                }}
                                className="btn-tinta"
                                style={{ fontSize: '11px', padding: '5px 12px' }}
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
                                style={{ fontSize: '11px', padding: '5px 12px' }}
                              >
                                Inscribirme
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: CRONOGRAMA OFICIAL */}
        {activeView === 'cronograma' && (
          <div style={{ border: '2px solid #16130F', background: '#FFFFFF' }}>
            <div style={{ padding: '12px 16px', background: '#F6F3EE', borderBottom: '1px solid #DDD7CC' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                Programa ordenado cronológicamente por horario
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #DDD7CC', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', width: '160px' }}>HORA</th>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', width: '180px' }}>UBICACIÓN</th>
                    <th style={{ padding: '10px 14px' }}>SESIÓN Y ORGANIZADOR</th>
                    <th style={{ padding: '10px 14px', width: '220px' }}>ESTADO Y AFORO</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>ACCIÓN</th>
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
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700 }}>{formatTime(s.starts_at)} - {formatTime(s.ends_at)}</div>
                        <div style={{ fontSize: '11px', color: '#5E584F' }}>{formatDate(s.starts_at)}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                        📍 {s.location || 'Sala por confirmar'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.title}</div>
                        <div style={{ fontSize: '11px', color: '#5E584F' }}>
                          <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{s.type}</span> · {s.organizer_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedSession(s)}
                          style={{
                            padding: '6px 12px',
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

      {/* MODAL DETALLE DE SESIÓN EXTENSO Y VISUAL */}
      {selectedSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 19, 15, 0.7)',
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
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '3px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner de Imagen del Evento */}
            <div style={{ height: '180px', width: '100%', position: 'relative', overflow: 'hidden' }}>
              <img
                src={getSessionImage(selectedSession.type, selectedSession.title, selectedSession.id).url}
                alt={selectedSession.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(22, 19, 15, 0.85)',
                  color: '#FFFFFF',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '50%',
                }}
              >
                ✕
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '16px',
                  backgroundColor: '#16130F',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {selectedSession.type}
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Título y Organizador */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#5E584F' }}>
                  Organizado por: <strong>{selectedSession.organizer_name}</strong>
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 0', lineHeight: 1.25 }}>
                  {selectedSession.title}
                </h2>
              </div>

              {/* Ficha técnica del evento */}
              <div
                style={{
                  backgroundColor: '#F6F3EE',
                  border: '1px solid #DDD7CC',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <span style={{ color: '#5E584F', display: 'block', fontSize: '11px' }}>FECHA Y HORARIO:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatDate(selectedSession.starts_at)} {formatTime(selectedSession.starts_at)} - {formatTime(selectedSession.ends_at)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#5E584F', display: 'block', fontSize: '11px' }}>LUGAR Y SALA:</span>
                  <strong>📍 {selectedSession.location || 'Sala por confirmar'}</strong>
                </div>
                <div>
                  <span style={{ color: '#5E584F', display: 'block', fontSize: '11px' }}>CAPACIDAD TOTAL:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedSession.capacity} plazas autorizadas</strong>
                </div>
                <div>
                  <span style={{ color: '#5E584F', display: 'block', fontSize: '11px' }}>DISPONIBILIDAD ACTUAL:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: selectedSession.free_slots > 0 ? '#1E6B4F' : '#E8440F' }}>
                    {selectedSession.free_slots > 0 ? `${selectedSession.free_slots} plazas libres` : `Agotado (${selectedSession.waitlist_count} en espera)`}
                  </strong>
                </div>
              </div>

              {/* Barra segmentada */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#5E584F', marginBottom: '6px' }}>
                  ESTADO DEL AFORO (1 MARCA = 5 PLAZAS):
                </div>
                <SegmentedMeter
                  capacity={selectedSession.capacity}
                  confirmed={selectedSession.confirmed_count}
                  waitlisted={selectedSession.waitlist_count}
                />
              </div>

              {/* Descripción detallada */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: '#5E584F', letterSpacing: '0.05em' }}>
                  Acerca de esta sesión
                </h4>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#16130F', margin: 0 }}>
                  {selectedSession.description || 'El organizador no ha incluido una descripción detallada para este evento.'}
                </p>
              </div>

              {/* Aviso explicativo y amable si existe choque de horario */}
              {selectedSession.has_conflict && (
                <div
                  style={{
                    border: '1px solid #B7700B',
                    backgroundColor: '#FFFDF0',
                    padding: '12px 14px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#8A5300',
                  }}
                >
                  ⚠️ <strong>Aviso de horario:</strong> Esta sesión coincide en horario con otra en la que ya estás confirmado:
                  <div style={{ marginTop: '4px', fontWeight: 600 }}>
                    {selectedSession.conflict_message}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#6A4000' }}>
                    No es posible confirmar dos plazas al mismo tiempo. Si deseas inscribirte aquí, primero debes cancelar tu otra sesión.
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div style={{ borderTop: '1px solid #DDD7CC', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                {!currentUser ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <Link
                      href="/login"
                      className="btn-senal"
                      style={{ width: '100%', padding: '12px', fontSize: '14px', textDecoration: 'none', display: 'block', boxSizing: 'border-box' }}
                    >
                      Iniciar sesión para inscribirme
                    </Link>
                  </div>
                ) : currentUser.role === 'organizer' ? (
                  <div style={{ width: '100%', fontSize: '13px', color: '#5E584F', background: '#F6F3EE', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Estás viendo esta sesión en modo Organizador.</span>
                    <Link href="/organizer" style={{ fontWeight: 700, color: '#16130F', textDecoration: 'underline' }}>
                      Gestionar en mi Panel →
                    </Link>
                  </div>
                ) : selectedSession.user_status === 'confirmed' ? (
                  <>
                    <button
                      onClick={() => setCredentialModalSession(selectedSession)}
                      className="btn-tinta"
                      style={{ fontSize: '13px', padding: '10px 16px', cursor: 'pointer' }}
                    >
                      Ver Credencial QR →
                    </button>

                    {selectedSession.has_attended && !selectedSession.survey_submitted && (
                      <button
                        onClick={() => setSurveyModalSession(selectedSession)}
                        className="btn-senal"
                        style={{ fontSize: '13px', padding: '10px 16px', cursor: 'pointer' }}
                      >
                        ⭐ Responder encuesta
                      </button>
                    )}

                    <button
                      onClick={() => setSessionToCancel(selectedSession)}
                      style={{
                        background: 'none',
                        border: '1px solid #E8440F',
                        color: '#E8440F',
                        fontSize: '13px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      Cancelar plaza
                    </button>
                  </>
                ) : selectedSession.user_status === 'waitlisted' ? (
                  <>
                    <span style={{ fontSize: '13px', color: '#5E584F', fontFamily: 'var(--font-mono)' }}>
                      Inscrito en lista de espera
                    </span>
                    <button
                      onClick={() => setSessionToCancel(selectedSession)}
                      style={{
                        background: 'none',
                        border: '1px solid #E8440F',
                        color: '#E8440F',
                        fontSize: '13px',
                        padding: '10px 16px',
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
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  >
                    Entrar en lista de espera (Puesto #{selectedSession.waitlist_count + 1})
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnroll(selectedSession.id)}
                    className="btn-senal"
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  >
                    Confirmar mi inscripción ({selectedSession.free_slots} plazas libres)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROPIO DE CONFIRMACIÓN DE CANCELACIÓN (SIN ALERTS TIPO LOCALHOST) */}
      {sessionToCancel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 19, 15, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => !cancelling && setSessionToCancel(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #E8440F',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              borderRadius: '2px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: '#E8440F', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Confirmar Liberación de Plaza
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px' }}>
              ¿Deseas cancelar tu inscripción?
            </h3>
            <p style={{ fontSize: '13px', color: '#5E584F', lineHeight: 1.5, margin: '0 0 18px' }}>
              Estás a punto de cancelar tu lugar en <strong>"{sessionToCancel.title}"</strong>. Si confirmas, tu plaza quedará libre y se promoverá automáticamente al primer participante en lista de espera.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                disabled={cancelling}
                onClick={() => setSessionToCancel(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #DDD7CC',
                  background: '#FFFFFF',
                  color: '#16130F',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Volver atrás
              </button>
              <button
                disabled={cancelling}
                onClick={executeCancel}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: '#E8440F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cancelling ? 'Cancelando…' : 'Sí, cancelar mi plaza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO DE CREDENCIAL QR INSTANTÁNEA */}
      {credentialModalSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 19, 15, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setCredentialModalSession(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--papel-calido)',
              border: '2px solid #16130F',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              borderRadius: '4px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ranura Gafete */}
            <div style={{ width: '48px', height: '6px', backgroundColor: '#16130F', borderRadius: '3px', margin: '0 auto 16px' }} />

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5E584F' }}>
              Credencial Oficial de Acceso
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px' }}>
              {currentUser?.name}
            </h3>
            <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '14px' }}>
              {credentialModalSession.title}
            </div>

            {/* Simulación QR instantánea en SVG de alto contraste */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #16130F',
                padding: '16px',
                display: 'inline-block',
                marginBottom: '12px',
              }}
            >
              <svg width="180" height="180" viewBox="0 0 100 100" style={{ display: 'block' }}>
                {/* Patrón estético QR de alta fidelidad */}
                <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />
                <rect x="10" y="10" width="25" height="25" fill="#16130F" />
                <rect x="15" y="15" width="15" height="15" fill="#FFFFFF" />
                <rect x="18" y="18" width="9" height="9" fill="#16130F" />

                <rect x="65" y="10" width="25" height="25" fill="#16130F" />
                <rect x="70" y="15" width="15" height="15" fill="#FFFFFF" />
                <rect x="73" y="18" width="9" height="9" fill="#16130F" />

                <rect x="10" y="65" width="25" height="25" fill="#16130F" />
                <rect x="15" y="70" width="15" height="15" fill="#FFFFFF" />
                <rect x="18" y="73" width="9" height="9" fill="#16130F" />

                {/* Datos internos */}
                <rect x="42" y="15" width="6" height="6" fill="#16130F" />
                <rect x="52" y="15" width="6" height="6" fill="#16130F" />
                <rect x="42" y="25" width="6" height="6" fill="#16130F" />
                <rect x="52" y="32" width="6" height="6" fill="#16130F" />
                <rect x="42" y="42" width="16" height="16" fill="#16130F" />
                <rect x="65" y="45" width="8" height="8" fill="#16130F" />
                <rect x="80" y="45" width="8" height="8" fill="#16130F" />
                <rect x="65" y="65" width="10" height="10" fill="#16130F" />
                <rect x="80" y="65" width="10" height="10" fill="#16130F" />
                <rect x="45" y="75" width="10" height="10" fill="#16130F" />
              </svg>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#16130F', fontWeight: 700, marginBottom: '6px' }}>
              TOKEN: EV-{(credentialModalSession.enrollment_id || 'CONF').slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '11px', color: '#5E584F', marginBottom: '16px' }}>
              📍 {credentialModalSession.location || 'Auditorio'} · {formatTime(credentialModalSession.starts_at)}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <Link
                href={`/credential/${credentialModalSession.enrollment_id}`}
                className="btn-outline"
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                Abrir gafete completo
              </Link>
              <button
                onClick={() => setCredentialModalSession(null)}
                className="btn-tinta"
                style={{ fontSize: '11px', padding: '6px 14px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO DE ENCUESTA */}
      {surveyModalSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 19, 15, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => !submittingSurvey && setSurveyModalSession(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #16130F',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              borderRadius: '2px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', marginBottom: '6px' }}>
              Opinión del Asistente
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>
              ¿Cómo calificarías "{surveyModalSession.title}"?
            </h3>
            <p style={{ fontSize: '12px', color: '#5E584F', margin: '0 0 16px' }}>
              Tu respuesta es breve (máximo 30 segundos) y ayuda al organizador a calibrar las próximas sesiones.
            </p>

            <form onSubmit={handleSurveySubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Calificación general (1 a 5 estrellas):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSurveyRating(star)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        fontSize: '16px',
                        border: '1px solid #16130F',
                        background: surveyRating >= star ? '#16130F' : '#FFFFFF',
                        color: surveyRating >= star ? '#FFD700' : '#16130F',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Comentario u observación (opcional):
                </label>
                <textarea
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  placeholder="¿Qué te pareció el expositor, el ritmo o el contenido?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #16130F',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={submittingSurvey}
                  onClick={() => setSurveyModalSession(null)}
                  style={{ padding: '8px 14px', border: '1px solid #DDD7CC', background: '#FFF', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingSurvey}
                  className="btn-senal"
                  style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
                >
                  {submittingSurvey ? 'Enviando…' : 'Enviar mi opinión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
