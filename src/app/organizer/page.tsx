'use client';

import { useEffect, useState, useTransition } from 'react';
import { SegmentedMeter } from '../components/SegmentedMeter';

interface SessionData {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled';
  organizer_id: string;
  organizer_name: string;
  confirmed_count: number;
  waitlist_count: number;
  attended_count: number;
  no_shows: number;
  occupancy_rate: number;
  attendance_rate: number;
  survey_avg: number;
  survey_count: number;
  is_owner: boolean;
  needs_attention: boolean;
  attention_reasons: string[];
}

interface SessionDetail {
  session: SessionData;
  confirmed: {
    enrollment_id: string;
    user_id: string;
    name: string;
    email: string;
    enrolled_at: string;
    qr_token: string;
    attended_at: string | null;
  }[];
  waitlist: {
    enrollment_id: string;
    user_id: string;
    name: string;
    email: string;
    enrolled_at: string;
    position: number;
  }[];
  pending?: {
    enrollment_id: string;
    user_id: string;
    name: string;
    email: string;
    enrolled_at: string;
  }[];
  auditLogs: {
    id: string;
    action: string;
    previous_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    created_at: string;
    changed_by_name: string | null;
  }[];
  surveys: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user_name: string;
  }[];
}

interface SurveyGlobal {
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

export default function OrganizerPage() {
  const [activeTab, setActiveTab] = useState<'operacion' | 'mis_sesiones' | 'asistencia' | 'catalogo'>('operacion');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [attentionSessions, setAttentionSessions] = useState<SessionData[]>([]);
  const [surveys, setSurveys] = useState<SurveyGlobal>({ total: 0, average_rating: 0, recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Toggle para ver solo mis sesiones en la tabla en vivo o todas
  const [showOnlyMineInLive, setShowOnlyMineInLive] = useState(true);

  // Filtro de Mis Sesiones
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'cancelled'>('all');

  // Detalle de Sesión
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);
  const [reschedulingSession, setReschedulingSession] = useState<SessionData | null>(null);
  const [reducingSession, setReducingSession] = useState<SessionData | null>(null);

  // Modal genérico propio de confirmación (sin confirm tipo localhost)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'taller',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    capacity: 25,
    status: 'published',
    requires_approval: false,
  });

  const [editForm, setEditForm] = useState({
    title: '',
    type: 'taller',
    description: '',
    location: '',
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    starts_at: '',
    ends_at: '',
    location: '',
  });

  const [reduceForm, setReduceForm] = useState({
    newCapacity: 20,
  });

  // Check-in manual
  const [checkInToken, setCheckInToken] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    status: 'recorded' | 'already_registered' | 'error';
    message: string;
    attendee?: { name: string; email: string; session: string };
    original_recorded_at?: string;
  } | null>(null);

  const [, startTransition] = useTransition();

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/organizer/dashboard');
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('403 Prohibido: Se requieren permisos de organizador para ver este panel.');
        }
        throw new Error('Error al cargar datos del panel');
      }
      const data = await res.json();
      setSessions(data.sessions || []);
      setAttentionSessions(data.attentionSessions || []);
      setSurveys(data.surveys || { total: 0, average_rating: 0, recent: [] });
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al conectar');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sStr = new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString().slice(0, 16);
    const eStr = new Date(tomorrow.setHours(12, 0, 0, 0)).toISOString().slice(0, 16);
    setCreateForm({
      title: '',
      type: 'taller',
      description: '',
      location: '',
      starts_at: sStr,
      ends_at: eStr,
      capacity: 25,
      status: 'published',
      requires_approval: false,
    });
    setShowCreateModal(true);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true' || params.get('action') === 'new') {
        openCreateModal();
      }
      if (params.get('tab') === 'mis_sesiones') {
        setActiveTab('mis_sesiones');
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const openSessionDetail = async (id: string) => {
    setSelectedSessionId(id);
    setLoadingDetail(true);
    setSessionDetail(null);
    try {
      const res = await fetch(`/api/organizer/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSessionDetail(data);
      } else {
        setActionMessage({ type: 'err', text: 'No se pudo cargar el detalle de la sesión.' });
      }
    } catch {
      setActionMessage({ type: 'err', text: 'Error de red al cargar detalle.' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch('/api/organizer/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Error al crear la sesión' });
        return;
      }
      setShowCreateModal(false);
      setActionMessage({ type: 'ok', text: `Sesión "${data.session.title}" creada y añadida exitosamente a tu agenda.` });
      await loadDashboard();
    } catch {
      setActionMessage({ type: 'err', text: 'Error de conexión al crear sesión.' });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setActionMessage(null);
    try {
      const res = await fetch(`/api/organizer/sessions/${editingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Error al editar la sesión' });
        return;
      }
      setEditingSession(null);
      setActionMessage({ type: 'ok', text: 'Sesión actualizada correctamente.' });
      await loadDashboard();
      if (selectedSessionId === editingSession.id) openSessionDetail(editingSession.id);
    } catch {
      setActionMessage({ type: 'err', text: 'Error al conectar con el servidor.' });
    }
  };

  const handlePublish = (id: string) => {
    setConfirmModal({
      title: 'Publicar sesión',
      message: '¿Deseas publicar esta sesión en el catálogo general? Quedará visible inmediatamente para que los participantes se inscriban.',
      confirmText: 'Sí, publicar ahora',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/organizer/sessions/${id}/publish`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) {
            setActionMessage({ type: 'err', text: data.error || 'Error al publicar' });
            return;
          }
          setActionMessage({ type: 'ok', text: 'Sesión publicada exitosamente en el catálogo.' });
          await loadDashboard();
          if (selectedSessionId === id) openSessionDetail(id);
        } catch {
          setActionMessage({ type: 'err', text: 'Error de red al publicar.' });
        }
      },
    });
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingSession) return;
    try {
      const res = await fetch(`/api/organizer/sessions/${reschedulingSession.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescheduleForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Error al reprogramar' });
        return;
      }
      setReschedulingSession(null);
      setActionMessage({
        type: 'ok',
        text: `Sesión reprogramada exitosamente. Se envió un aviso a los inscritos.${
          data.affectedUserIds?.length ? ` (${data.affectedUserIds.length} con choque de horario).` : ''
        }`,
      });
      await loadDashboard();
      if (selectedSessionId === reschedulingSession.id) openSessionDetail(reschedulingSession.id);
    } catch {
      setActionMessage({ type: 'err', text: 'Error al conectar con el servidor.' });
    }
  };

  const handleReduceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reducingSession) return;
    try {
      const res = await fetch(`/api/organizer/sessions/${reducingSession.id}/reduce-capacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reduceForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Error al reducir aforo' });
        return;
      }
      setReducingSession(null);
      setActionMessage({
        type: 'ok',
        text: `Aforo reducido a ${reduceForm.newCapacity}. Se reordenó la lista y se avisó a los participantes transferidos a lista de espera.`,
      });
      await loadDashboard();
      if (selectedSessionId === reducingSession.id) openSessionDetail(reducingSession.id);
    } catch {
      setActionMessage({ type: 'err', text: 'Error de conexión al reducir aforo.' });
    }
  };

  const handleCancelSession = (id: string, title: string) => {
    setConfirmModal({
      title: 'Cancelar definitivamente la sesión',
      message: `¿Estás seguro de cancelar "${title}"? Se notificará a todos los inscritos y se liberarán sus horarios.`,
      confirmText: 'Sí, cancelar sesión',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/organizer/sessions/${id}/cancel`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) {
            setActionMessage({ type: 'err', text: data.error || 'Error al cancelar la sesión' });
            return;
          }
          setActionMessage({ type: 'ok', text: `La sesión "${title}" ha sido cancelada y los inscritos fueron notificados.` });
          await loadDashboard();
          if (selectedSessionId === id) openSessionDetail(id);
        } catch {
          setActionMessage({ type: 'err', text: 'Error de red al cancelar sesión.' });
        }
      },
    });
  };

  const handleApproveEnrollment = async (sessionId: string, enrollmentId: string) => {
    try {
      const res = await fetch(`/api/organizer/sessions/${sessionId}/enrollments/${enrollmentId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Error al aprobar solicitud' });
      } else {
        setActionMessage({ type: 'ok', text: data.message });
        await openSessionDetail(sessionId);
        await loadDashboard();
      }
    } catch {
      setActionMessage({ type: 'err', text: 'Error de conexión al aprobar.' });
    }
  };

  const handleRejectEnrollment = async (sessionId: string, enrollmentId: string) => {
    try {
      const res = await fetch(`/api/organizer/sessions/${sessionId}/enrollments/${enrollmentId}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Error al rechazar solicitud' });
      } else {
        setActionMessage({ type: 'ok', text: data.message });
        await openSessionDetail(sessionId);
        await loadDashboard();
      }
    } catch {
      setActionMessage({ type: 'err', text: 'Error de conexión al rechazar.' });
    }
  };

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
          message: data.error || 'Error al registrar asistencia',
        });
      } else {
        setCheckInResult({
          status: data.status,
          message: data.message,
          attendee: data.attendee,
          original_recorded_at: data.original_recorded_at,
        });
        setCheckInToken('');
        startTransition(() => {
          loadDashboard();
        });
      }
    } catch {
      setCheckInResult({
        status: 'error',
        message: 'Error de conexión con el lector de credenciales',
      });
    } finally {
      setCheckInLoading(false);
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

  const mySessions = sessions.filter((s) => s.is_owner);
  const filteredMySessions = mySessions.filter((s) => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  const liveTableSessions = showOnlyMineInLive ? mySessions : sessions;

  if (loading) {
    return (
      <main className="container" style={{ padding: '40px 16px' }}>
        <div style={{ height: '24px', width: '200px', backgroundColor: '#DDD7CC', marginBottom: '16px' }} />
        <div style={{ height: '80px', width: '100%', backgroundColor: '#F6F3EE', marginBottom: '24px' }} />
        <div style={{ height: '300px', width: '100%', backgroundColor: '#F6F3EE' }} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Acceso Restringido</h2>
        <p style={{ color: '#5E584F', marginBottom: '24px' }}>{error}</p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#16130F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Iniciar sesión como Organizador
        </a>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '24px 16px 80px' }}>
      {/* Encabezado Principal del Organizador */}
      <div
        style={{
          borderBottom: '2px solid #16130F',
          paddingBottom: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#5E584F',
            }}
          >
            Panel de Gestión del Organizador
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '2px 0 0' }}>
            Operación en vivo
          </h1>
        </div>

        {/* Botón Principal "+ Crear sesión" SIEMPRE VISIBLE */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={openCreateModal}
            style={{
              backgroundColor: 'var(--senal)',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            + Crear nueva sesión
          </button>
        </div>
      </div>

      {/* Pestañas de navegación interna */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          onClick={() => { setActiveTab('operacion'); setSelectedSessionId(null); }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #16130F',
            background: activeTab === 'operacion' ? '#16130F' : '#FFFFFF',
            color: activeTab === 'operacion' ? '#FFFFFF' : '#16130F',
            borderRadius: '2px',
          }}
        >
          Operación en vivo ({mySessions.length})
        </button>
        <button
          onClick={() => { setActiveTab('mis_sesiones'); setSelectedSessionId(null); }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #16130F',
            background: activeTab === 'mis_sesiones' ? '#16130F' : '#FFFFFF',
            color: activeTab === 'mis_sesiones' ? '#FFFFFF' : '#16130F',
            borderRadius: '2px',
          }}
        >
          Mis sesiones y Edición ({mySessions.length})
        </button>
        <button
          onClick={() => { setActiveTab('asistencia'); setSelectedSessionId(null); }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #16130F',
            background: activeTab === 'asistencia' ? '#16130F' : '#FFFFFF',
            color: activeTab === 'asistencia' ? '#FFFFFF' : '#16130F',
            borderRadius: '2px',
          }}
        >
          Escanear QR / Asistencia
        </button>
        <button
          onClick={() => { setActiveTab('catalogo'); setSelectedSessionId(null); }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #16130F',
            background: activeTab === 'catalogo' ? '#16130F' : '#FFFFFF',
            color: activeTab === 'catalogo' ? '#FFFFFF' : '#16130F',
            borderRadius: '2px',
          }}
        >
          Otras sesiones del evento ({sessions.length})
        </button>
      </div>

      {/* Avisos o mensajes de acción */}
      {actionMessage && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            border: `1px solid ${actionMessage.type === 'ok' ? '#1E6B4F' : '#E8440F'}`,
            background: actionMessage.type === 'ok' ? '#F4FBF7' : '#FFF5F2',
            color: actionMessage.type === 'ok' ? '#1E6B4F' : '#E8440F',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* VISTA 1: OPERACIÓN EN VIVO */}
      {activeTab === 'operacion' && !selectedSessionId && (
        <section>
          {/* Franja "Requieren atención" */}
          {attentionSessions.length > 0 && (
            <div
              style={{
                border: '2px solid #E8440F',
                background: '#FFF8F6',
                padding: '14px 18px',
                marginBottom: '24px',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  color: '#E8440F',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#E8440F',
                    borderRadius: '50%',
                  }}
                />
                Requieren atención inmediata ({attentionSessions.length} sesiones)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {attentionSessions.map((s) => (
                  <div
                    key={`att-${s.id}`}
                    style={{
                      border: '1px solid #E8440F',
                      padding: '12px',
                      background: '#FFFFFF',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{s.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {s.attention_reasons.map((r, i) => (
                        <span
                          key={i}
                          style={{
                            background: '#FFF0EB',
                            color: '#E8440F',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => openSessionDetail(s.id)}
                      style={{
                        padding: '5px 10px',
                        background: '#16130F',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Ver inscritos / gestionar →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen numérico rápido */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div style={{ border: '1px solid #DDD7CC', padding: '12px', background: '#F6F3EE' }}>
              <div style={{ fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
                Mis Sesiones
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                {mySessions.length}
              </div>
            </div>
            <div style={{ border: '1px solid #DDD7CC', padding: '12px', background: '#F6F3EE' }}>
              <div style={{ fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
                Inscritos Confirmados
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                {mySessions.reduce((acc, s) => acc + s.confirmed_count, 0)}
              </div>
            </div>
            <div style={{ border: '1px solid #DDD7CC', padding: '12px', background: '#F6F3EE' }}>
              <div style={{ fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
                En Lista de Espera
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                {mySessions.reduce((acc, s) => acc + s.waitlist_count, 0)}
              </div>
            </div>
            <div style={{ border: '1px solid #DDD7CC', padding: '12px', background: '#F6F3EE' }}>
              <div style={{ fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
                Asistencia en Puerta
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                {mySessions.reduce((acc, s) => acc + s.attended_count, 0)}
              </div>
            </div>
            <div style={{ border: '1px solid #DDD7CC', padding: '12px', background: '#F6F3EE' }}>
              <div style={{ fontSize: '11px', color: '#5E584F', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
                Opiniones de Asistentes
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                ⭐ {surveys.average_rating > 0 ? surveys.average_rating.toFixed(1) : '—'}
                <span style={{ fontSize: '12px', color: '#5E584F', fontWeight: 400 }}> ({surveys.total})</span>
              </div>
            </div>
          </div>

          {/* Tabla de monitoreo en vivo con acciones directas */}
          <div style={{ border: '1px solid #16130F', background: '#FFFFFF' }}>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #DDD7CC',
                background: '#F6F3EE',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>
                  Monitoreo de Sesiones en Vivo
                </span>
                <label style={{ fontSize: '12px', color: '#5E584F', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={showOnlyMineInLive}
                    onChange={(e) => setShowOnlyMineInLive(e.target.checked)}
                  />
                  Mostrar solo mis sesiones ({mySessions.length})
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={openCreateModal}
                  style={{
                    padding: '6px 12px',
                    background: '#E8440F',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Nueva sesión
                </button>
                <a
                  href="/api/organizer/export-csv"
                  style={{
                    padding: '6px 12px',
                    background: '#FFFFFF',
                    color: '#16130F',
                    border: '1px solid #16130F',
                    fontSize: '12px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Exportar CSV
                </a>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #DDD7CC', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>HORARIO</th>
                    <th style={{ padding: '10px 12px' }}>SESIÓN</th>
                    <th style={{ padding: '10px 12px', minWidth: '160px' }}>OCUPACIÓN (BARRA SEGMENTADA)</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>CONF / ASIST</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>ESPERA</th>
                    <th style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>OPINIONES</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>GESTIÓN DIRECTA</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTableSessions.map((s, idx) => (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid #EEE9DF',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <div>{formatDate(s.starts_at)}</div>
                        <div style={{ color: '#5E584F' }}>{formatTime(s.starts_at)} - {formatTime(s.ends_at)}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{s.title}</div>
                        <div style={{ fontSize: '11px', color: '#5E584F' }}>
                          <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>{s.type}</span> · {s.location || 'Sin sala'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                        <strong>{s.confirmed_count}</strong> / <span style={{ color: '#1E6B4F' }}>{s.attended_count}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                        {s.waitlist_count > 0 ? (
                          <span style={{ fontWeight: 700, color: '#E8440F' }}>{s.waitlist_count}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                        {s.survey_count > 0 ? (
                          <span>⭐ {s.survey_avg.toFixed(1)} ({s.survey_count})</span>
                        ) : (
                          <span style={{ color: '#8A8378' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openSessionDetail(s.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#16130F',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Inscritos ({s.confirmed_count})
                          </button>

                          {s.is_owner && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingSession(s);
                                  setEditForm({
                                    title: s.title,
                                    type: s.type,
                                    description: s.description || '',
                                    location: s.location || '',
                                  });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: '#FFFFFF',
                                  color: '#16130F',
                                  border: '1px solid #16130F',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  setReducingSession(s);
                                  setReduceForm({ newCapacity: Math.max(1, s.capacity - 5) });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: '#FFFFFF',
                                  color: '#16130F',
                                  border: '1px solid #16130F',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Aforo
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* VISTA 2: MIS SESIONES (CRUD completo y gestión) */}
      {activeTab === 'mis_sesiones' && !selectedSessionId && (
        <section>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Filtros de estado */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'published', 'draft', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: '1px solid #16130F',
                    background: statusFilter === st ? '#16130F' : '#FFFFFF',
                    color: statusFilter === st ? '#FFFFFF' : '#16130F',
                  }}
                >
                  {st === 'all' && `Todas (${mySessions.length})`}
                  {st === 'published' && `Publicadas (${mySessions.filter((s) => s.status === 'published').length})`}
                  {st === 'draft' && `Borradores (${mySessions.filter((s) => s.status === 'draft').length})`}
                  {st === 'cancelled' && `Canceladas (${mySessions.filter((s) => s.status === 'cancelled').length})`}
                </button>
              ))}
            </div>

            <button
              onClick={openCreateModal}
              style={{
                padding: '8px 16px',
                background: '#E8440F',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ➕ Crear nueva sesión
            </button>
          </div>

          {filteredMySessions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px solid #DDD7CC', background: '#F6F3EE' }}>
              <p style={{ color: '#5E584F', margin: '0 0 12px' }}>No hay sesiones en esta categoría.</p>
              <button
                onClick={openCreateModal}
                style={{ padding: '8px 16px', background: '#16130F', color: '#FFF', border: 'none', cursor: 'pointer' }}
              >
                Crear una sesión ahora
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMySessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #16130F',
                    padding: '16px',
                    background: '#FFFFFF',
                    borderLeft: s.status === 'cancelled' ? '6px solid #8A8378' : s.status === 'draft' ? '6px dashed #5E584F' : '6px solid #16130F',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono, monospace)',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            padding: '2px 6px',
                            border: '1px solid #16130F',
                            background: s.status === 'published' ? '#16130F' : '#FFFFFF',
                            color: s.status === 'published' ? '#FFFFFF' : '#16130F',
                          }}
                        >
                          {s.status}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', color: '#5E584F' }}>
                          {s.type}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{s.title}</h3>
                      <div style={{ fontSize: '12px', color: '#5E584F' }}>
                        <span>📍 {s.location || 'Sin sala'}</span> ·{' '}
                        <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                          {formatDate(s.starts_at)} {formatTime(s.starts_at)} - {formatTime(s.ends_at)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de aforo */}
                    <div style={{ width: '220px' }}>
                      <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                    </div>
                  </div>

                  {s.description && (
                    <p style={{ fontSize: '13px', color: '#16130F', margin: '8px 0 14px', lineHeight: 1.4 }}>
                      {s.description}
                    </p>
                  )}

                  {/* Acciones directas del organizador */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '10px', borderTop: '1px solid #DDD7CC' }}>
                    <button
                      onClick={() => openSessionDetail(s.id)}
                      style={{
                        padding: '6px 14px',
                        background: '#16130F',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Asistencia y Detalle ({s.confirmed_count})
                    </button>

                    {s.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(s.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#1E6B4F',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Publicar en catálogo
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingSession(s);
                        setEditForm({
                          title: s.title,
                          type: s.type,
                          description: s.description || '',
                          location: s.location || '',
                        });
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#FFFFFF',
                        color: '#16130F',
                        border: '1px solid #16130F',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Editar datos
                    </button>

                    <button
                      onClick={() => {
                        setReschedulingSession(s);
                        setRescheduleForm({
                          starts_at: new Date(s.starts_at).toISOString().slice(0, 16),
                          ends_at: new Date(s.ends_at).toISOString().slice(0, 16),
                          location: s.location || '',
                        });
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#FFFFFF',
                        color: '#16130F',
                        border: '1px solid #16130F',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Reprogramar fecha/hora
                    </button>

                    <button
                      onClick={() => {
                        setReducingSession(s);
                        setReduceForm({ newCapacity: Math.max(1, s.capacity - 5) });
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#FFFFFF',
                        color: '#16130F',
                        border: '1px solid #16130F',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Modificar aforo
                    </button>

                    {s.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelSession(s.id, s.title)}
                        style={{
                          padding: '6px 12px',
                          background: '#FFF5F2',
                          color: '#E8440F',
                          border: '1px solid #E8440F',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginLeft: 'auto',
                        }}
                      >
                        Cancelar sesión
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VISTA 3: ASISTENCIA Y ACREDITACIÓN QR */}
      {activeTab === 'asistencia' && (
        <section style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ border: '2px solid #16130F', background: '#FFFFFF', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
              Acreditación y Control de Acceso
            </h2>
            <p style={{ fontSize: '13px', color: '#5E584F', marginBottom: '20px' }}>
              Escanea el código QR de la credencial o ingresa el token para registrar la asistencia. La validación es instantánea e idempotente.
            </p>

            <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                value={checkInToken}
                onChange={(e) => setCheckInToken(e.target.value)}
                placeholder="Código QR o token manual (ej. 3b9a1e8f...)"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid #16130F',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                disabled={checkInLoading || !checkInToken.trim()}
                style={{
                  padding: '10px 18px',
                  background: '#16130F',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {checkInLoading ? 'Verificando…' : 'Validar Entrada'}
              </button>
            </form>

            {checkInResult && (
              <div
                style={{
                  border: `2px solid ${checkInResult.status === 'recorded' ? '#1E6B4F' : checkInResult.status === 'already_registered' ? '#B7700B' : '#E8440F'}`,
                  padding: '16px',
                  background: checkInResult.status === 'recorded' ? '#F4FBF7' : checkInResult.status === 'already_registered' ? '#FFFDF0' : '#FFF5F2',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                  {checkInResult.status === 'recorded' && '✓ ACCESO PERMITIDO — Asistencia Registrada'}
                  {checkInResult.status === 'already_registered' && '⚠️ ACCESO YA REGISTRADO PREVIAMENTE'}
                  {checkInResult.status === 'error' && '✕ DENEGADO — Credencial no válida'}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '13px' }}>{checkInResult.message}</p>
                {checkInResult.attendee && (
                  <div style={{ fontSize: '12px', borderTop: '1px solid #DDD7CC', paddingTop: '8px' }}>
                    <div><strong>Participante:</strong> {checkInResult.attendee.name} ({checkInResult.attendee.email})</div>
                    <div><strong>Sesión:</strong> {checkInResult.attendee.session}</div>
                    {checkInResult.original_recorded_at && (
                      <div><strong>Ingreso inicial:</strong> {new Date(checkInResult.original_recorded_at).toLocaleTimeString('es-ES')}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* VISTA 4: OTRAS SESIONES DEL EVENTO */}
      {activeTab === 'catalogo' && !selectedSessionId && (
        <section>
          <div style={{ padding: '12px 16px', background: '#F6F3EE', border: '1px solid #DDD7CC', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#5E584F' }}>
              ℹ️ Catálogo global del evento. Aquí puedes consultar el programa completo y sesiones de otros organizadores en modo consulta.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid #16130F',
                  padding: '14px',
                  background: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', color: '#5E584F' }}>
                    {s.type} · {s.status}
                  </span>
                  {s.is_owner && (
                    <span style={{ fontSize: '10px', background: '#16130F', color: '#FFFFFF', padding: '2px 6px', fontWeight: 600 }}>
                      MI SESIÓN
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>{s.title}</h4>
                <div style={{ fontSize: '12px', color: '#5E584F', marginBottom: '10px' }}>
                  Organiza: <strong>{s.organizer_name}</strong>
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', marginBottom: '12px' }}>
                  {formatDate(s.starts_at)} {formatTime(s.starts_at)} - {formatTime(s.ends_at)}
                </div>
                <SegmentedMeter capacity={s.capacity} confirmed={s.confirmed_count} waitlisted={s.waitlist_count} />
                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #EEE', textAlign: 'right' }}>
                  <button
                    onClick={() => openSessionDetail(s.id)}
                    style={{
                      padding: '4px 8px',
                      background: 'none',
                      border: '1px solid #16130F',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Ver detalles →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DETALLE COMPLETO DE UNA SESIÓN */}
      {selectedSessionId && (
        <section style={{ border: '2px solid #16130F', background: '#FFFFFF', padding: '20px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #16130F', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <button
                onClick={() => setSelectedSessionId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#5E584F',
                  padding: 0,
                  marginBottom: '6px',
                  textDecoration: 'underline',
                }}
              >
                ← Volver al listado
              </button>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
                {sessionDetail?.session.title || 'Cargando sesión…'}
              </h2>
              {sessionDetail && (
                <div style={{ fontSize: '12px', color: '#5E584F', marginTop: '4px' }}>
                  {sessionDetail.session.location || 'Sin sala'} · {formatDate(sessionDetail.session.starts_at)}{' '}
                  {formatTime(sessionDetail.session.starts_at)} - {formatTime(sessionDetail.session.ends_at)}
                </div>
              )}
            </div>

            {sessionDetail && (
              <a
                href={`/api/organizer/export-csv?sessionId=${sessionDetail.session.id}`}
                style={{
                  padding: '8px 14px',
                  background: '#16130F',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                📥 Descargar CSV de asistencia
              </a>
            )}
          </div>

          {loadingDetail && <p style={{ color: '#5E584F' }}>Cargando datos detallados de la sesión…</p>}

          {sessionDetail && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Solicitudes Pendientes de Aprobación */}
              {sessionDetail.pending && sessionDetail.pending.length > 0 && (
                <div style={{ gridColumn: '1 / -1', border: '2px solid #E8440F', padding: '16px', background: '#FFF8F6' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#E8440F', marginBottom: '8px' }}>
                    Solicitudes Pendientes de Aprobación — {sessionDetail.pending.length} por revisar
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#FFF0EB', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Nombre</th>
                          <th style={{ padding: '6px 8px' }}>Correo</th>
                          <th style={{ padding: '6px 8px' }}>Fecha Solicitud</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionDetail.pending.map((p) => (
                          <tr key={p.enrollment_id} style={{ borderBottom: '1px solid #FCE4DC' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.name}</td>
                            <td style={{ padding: '6px 8px', color: '#5E584F' }}>{p.email}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                              {new Date(p.enrolled_at).toLocaleString('es-ES')}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleApproveEnrollment(sessionDetail.session.id, p.enrollment_id)}
                                style={{ padding: '4px 10px', background: '#1E6B4F', color: '#FFFFFF', border: 'none', fontSize: '11px', cursor: 'pointer', marginRight: '6px' }}
                              >
                                ✓ Aprobar
                              </button>
                              <button
                                onClick={() => handleRejectEnrollment(sessionDetail.session.id, p.enrollment_id)}
                                style={{ padding: '4px 10px', background: '#FFFFFF', border: '1px solid #E8440F', color: '#E8440F', fontSize: '11px', cursor: 'pointer' }}
                              >
                                ✕ Rechazar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Columna 1: Participantes Confirmados */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid #1E6B4F', paddingBottom: '6px', marginBottom: '12px' }}>
                  Inscritos Confirmados ({sessionDetail.confirmed.length} / {sessionDetail.session.capacity})
                </h3>
                {sessionDetail.confirmed.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#5E584F' }}>Sin inscritos confirmados aún.</p>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #DDD7CC' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F6F3EE', borderBottom: '1px solid #DDD7CC', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Nombre</th>
                          <th style={{ padding: '6px 8px' }}>Correo</th>
                          <th style={{ padding: '6px 8px' }}>Asistencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionDetail.confirmed.map((c) => (
                          <tr key={c.enrollment_id} style={{ borderBottom: '1px solid #EEE' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{c.name}</td>
                            <td style={{ padding: '6px 8px', color: '#5E584F' }}>{c.email}</td>
                            <td style={{ padding: '6px 8px' }}>
                              {c.attended_at ? (
                                <span style={{ color: '#1E6B4F', fontWeight: 600 }}>
                                  ✓ {new Date(c.attended_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span style={{ color: '#8A8378' }}>Pendiente</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Columna 2: Lista de espera en orden FIFO */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid #E8440F', paddingBottom: '6px', marginBottom: '12px' }}>
                  Lista de Espera en Orden de Llegada ({sessionDetail.waitlist.length})
                </h3>
                {sessionDetail.waitlist.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#5E584F' }}>No hay participantes en espera.</p>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #DDD7CC' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F6F3EE', borderBottom: '1px solid #DDD7CC', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', fontFamily: 'var(--font-mono, monospace)' }}>#</th>
                          <th style={{ padding: '6px 8px' }}>Nombre</th>
                          <th style={{ padding: '6px 8px' }}>Correo</th>
                          <th style={{ padding: '6px 8px' }}>Registrado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionDetail.waitlist.map((w) => (
                          <tr key={w.enrollment_id} style={{ borderBottom: '1px solid #EEE' }}>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#E8440F' }}>
                              #{w.position}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{w.name}</td>
                            <td style={{ padding: '6px 8px', color: '#5E584F' }}>{w.email}</td>
                            <td style={{ padding: '6px 8px', color: '#5E584F' }}>
                              {new Date(w.enrolled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Columna 3: Registro de Cambios (Auditoría) */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid #16130F', paddingBottom: '6px', marginBottom: '12px' }}>
                  Registro de Cambios y Auditoría ({sessionDetail.auditLogs.length})
                </h3>
                {sessionDetail.auditLogs.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#5E584F' }}>Sin modificaciones registradas.</p>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionDetail.auditLogs.map((log) => (
                      <div key={log.id} style={{ border: '1px solid #DDD7CC', padding: '8px 10px', fontSize: '12px', background: '#FBF9F6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' }}>
                            {log.action}
                          </strong>
                          <span style={{ color: '#5E584F', fontSize: '11px' }}>
                            {new Date(log.created_at).toLocaleString('es-ES')}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#5E584F' }}>
                          Por: {log.changed_by_name || 'Sistema'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Columna 4: Opiniones de asistentes recibidas */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid #B7700B', paddingBottom: '6px', marginBottom: '12px' }}>
                  Opiniones de Asistentes Recibidas ({sessionDetail.surveys.length})
                </h3>
                {sessionDetail.surveys.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#5E584F' }}>Aún no se han recibido opiniones para esta sesión.</p>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionDetail.surveys.map((sv) => (
                      <div key={sv.id} style={{ border: '1px solid #DDD7CC', padding: '8px 10px', fontSize: '12px', background: '#FFFFFF' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{sv.user_name}</span>
                          <span style={{ color: '#B7700B', fontWeight: 700 }}>⭐ {sv.rating} / 5</span>
                        </div>
                        {sv.comment && <p style={{ margin: '4px 0 0', color: '#16130F', fontStyle: 'italic' }}>&ldquo;{sv.comment}&rdquo;</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* MODAL CREAR SESIÓN */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22, 19, 15, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #16130F', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Crear nueva sesión</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Título del evento *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ej. Taller de Inteligencia Artificial y LLMs"
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Tipo de evento *</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                  >
                    <option value="taller">Taller</option>
                    <option value="hackatón">Hackatón</option>
                    <option value="conferencia">Conferencia</option>
                    <option value="encuentro">Encuentro</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Cupo de participantes (≥1) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.capacity}
                    onChange={(e) => setCreateForm({ ...createForm, capacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Ubicación / Sala *</label>
                <input
                  type="text"
                  required
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  placeholder="Ej. Auditorio Central, Aula 102"
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Fecha y hora de inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.starts_at}
                    onChange={(e) => setCreateForm({ ...createForm, starts_at: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Fecha y hora de término *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.ends_at}
                    onChange={(e) => setCreateForm({ ...createForm, ends_at: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Descripción detallada</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe los objetivos, requisitos y contenido de la sesión..."
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Estado inicial</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as 'draft' | 'published' })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                >
                  <option value="published">Publicada (abierta inmediatamente al público)</option>
                  <option value="draft">Borrador (oculta al público)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  id="requires_approval"
                  checked={createForm.requires_approval}
                  onChange={(e) => setCreateForm({ ...createForm, requires_approval: e.target.checked })}
                />
                <label htmlFor="requires_approval" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Requiere aprobación previa del organizador (las solicitudes quedarán pendientes hasta que las apruebes)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', background: '#FFFFFF', border: '1px solid #16130F', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#E8440F', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Crear y guardar sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR SESIÓN */}
      {editingSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22, 19, 15, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #16130F', padding: '24px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Editar sesión</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Título</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Tipo</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                >
                  <option value="taller">Taller</option>
                  <option value="hackatón">Hackatón</option>
                  <option value="conferencia">Conferencia</option>
                  <option value="encuentro">Encuentro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Ubicación</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Descripción</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  style={{ padding: '8px 14px', background: '#FFFFFF', border: '1px solid #16130F', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 14px', background: '#16130F', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR SESIÓN */}
      {reschedulingSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22, 19, 15, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #16130F', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>Reprogramar fecha y hora</h3>
            <p style={{ fontSize: '12px', color: '#5E584F', marginBottom: '14px' }}>
              Al cambiar fecha o sala, el sistema validará choques de horario con las demás sesiones confirmadas de cada participante y les notificará dentro de la app.
            </p>
            <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Nuevo inicio</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleForm.starts_at}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, starts_at: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Nuevo fin</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleForm.ends_at}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, ends_at: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Nueva sala / ubicación</label>
                <input
                  type="text"
                  value={rescheduleForm.location}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, location: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReschedulingSession(null)}
                  style={{ padding: '8px 14px', background: '#FFFFFF', border: '1px solid #16130F', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 14px', background: '#16130F', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reprogramar y avisar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REDUCIR AFORO */}
      {reducingSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22, 19, 15, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #16130F', padding: '24px', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>Modificar / Reducir aforo</h3>
            <p style={{ fontSize: '12px', color: '#5E584F', marginBottom: '14px' }}>
              Capacidad actual: <strong>{reducingSession.capacity}</strong> plazas.<br />
              Inscritos confirmados: <strong>{reducingSession.confirmed_count}</strong>.<br />
              Si reduces por debajo de los inscritos, los últimos inscritos pasarán ordenadamente a la cabeza de la lista de espera con aviso inmediato.
            </p>
            <form onSubmit={handleReduceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Nuevo aforo (≥1)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reduceForm.newCapacity}
                  onChange={(e) => setReduceForm({ newCapacity: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #16130F', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReducingSession(null)}
                  style={{ padding: '8px 14px', background: '#FFFFFF', border: '1px solid #16130F', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 14px', background: '#16130F', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Guardar nuevo aforo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO DE CONFIRMACIÓN PROPIO (SIN ALERTS TIPO LOCALHOST) */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22, 19, 15, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: `2px solid ${confirmModal.danger ? '#E8440F' : '#16130F'}`,
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              borderRadius: '2px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: confirmModal.danger ? '#E8440F' : '#16130F' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#5E584F', lineHeight: 1.5, margin: '0 0 20px' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
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
                Volver
              </button>
              <button
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  cb();
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: confirmModal.danger ? '#E8440F' : '#16130F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
