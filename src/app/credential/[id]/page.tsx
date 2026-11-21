'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface CredentialData {
  enrollment_id: string;
  status: string;
  position: number | null;
  user_name: string;
  user_email: string;
  session_title: string;
  session_location: string;
  starts_at: string;
  ends_at: string;
  qr_token: string | null;
  qr_svg: string | null;
  has_attended: boolean;
  attended_at: string | null;
}

export default function CredentialPage() {
  const params = useParams();
  const id = params?.id as string;

  const [credential, setCredential] = useState<CredentialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchCredential = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/credentials/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'No se pudo cargar la credencial');
        }
        const data = await res.json();
        setCredential(data.credential);
      } catch (err: unknown) {
        setError((err as Error).message || 'Error al obtener la credencial');
      } finally {
        setLoading(false);
      }
    };
    fetchCredential();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Generando gafete de acceso...</p>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="container" style={{ maxWidth: '500px', textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '30px' }}>
          <h2 className="font-display" style={{ color: 'var(--accent-red)', marginBottom: '12px' }}>Credencial no disponible</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'No se encontró la inscripción solicitada.'}</p>
          <Link href="/" className="btn-secondary">Volver a la Agenda</Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(credential.starts_at);
  const endDate = new Date(credential.ends_at);

  return (
    <div className="container" style={{ maxWidth: '440px', padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>
          &larr; Volver a la Agenda
        </Link>
      </div>

      {/* Tarjeta de Gafete Físico con Lanyard Virtual */}
      <div className="credential-card">
        {/* Ranura del Lanyard */}
        <div className="lanyard-hole" />

        {/* Cabecera del Gafete */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--primary)',
              background: 'rgba(72, 229, 194, 0.1)',
              padding: '4px 12px',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '12px',
            }}
          >
            Pase de Acceso Universitario
          </span>
          <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
            {credential.session_title}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            📍 {credential.session_location}
          </p>
          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
            ⏰ {startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} &bull; {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Perforación de boleto */}
        <div className="ticket-divider" />

        {/* Cuerpo del gafete: Asistente y QR */}
        <div style={{ padding: '10px 24px 28px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Participante Acreditado
            </p>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-light)' }}>
              {credential.user_name}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{credential.user_email}</p>
          </div>

          {/* Render del Código QR */}
          {credential.qr_svg && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '16px auto',
              }}
              dangerouslySetInnerHTML={{ __html: credential.qr_svg }}
            />
          )}

          {/* Código manual de respaldo */}
          {credential.qr_token && (
            <div style={{ margin: '14px 0' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                CÓDIGO ALTERNATIVO DE INGRESO MANUAL:
              </span>
              <code
                style={{
                  background: 'var(--surface-card)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  letterSpacing: '0.05em',
                  color: 'var(--primary)',
                  display: 'inline-block',
                  userSelect: 'all',
                }}
              >
                {credential.qr_token}
              </code>
            </div>
          )}

          {/* Estado de Asistencia */}
          <div style={{ marginTop: '20px' }}>
            {credential.has_attended ? (
              <div
                style={{
                  background: 'rgba(72, 229, 194, 0.15)',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                ✓ Asistencia Verificada en Puerta
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, marginTop: '2px', color: 'var(--text-muted)' }}>
                  Registrado el {new Date(credential.attended_at!).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                }}
              >
                Presenta este código al personal en el acceso
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
