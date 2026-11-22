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

/**
 * Gafete de conferencia vertical según Sección 2 de la Guía de Arte:
 * "Credencial: gafete vertical con nombre grande, evento, QR de alto contraste
 * sobre fondo blanco y código en mono. Legible en móvil. Papel cálido, tinta negra,
 * un solo color de señal."
 */
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
      <main className="container" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <p style={{ color: 'var(--tinta-suave)', fontFamily: 'var(--font-mono)' }}>
          Generando gafete oficial de acceso…
        </p>
      </main>
    );
  }

  if (error || !credential) {
    return (
      <main className="container" style={{ maxWidth: '440px', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ border: '2px solid var(--tinta)', padding: '24px', backgroundColor: 'var(--papel)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--senal)' }}>
            Credencial no disponible
          </h2>
          <p style={{ color: 'var(--tinta-suave)', fontSize: '13px', marginBottom: '20px' }}>
            {error || 'No se encontró la inscripción solicitada.'}
          </p>
          <Link href="/" className="btn-tinta">
            ← Volver a Explorar eventos
          </Link>
        </div>
      </main>
    );
  }

  const startDate = new Date(credential.starts_at);
  const endDate = new Date(credential.ends_at);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <main className="container" style={{ maxWidth: '420px', padding: '24px 16px 80px' }}>
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

      {/* GAFETE VERTICAL IMPRESO */}
      <div
        style={{
          border: '2px solid var(--tinta)',
          backgroundColor: 'var(--papel-calido)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(22, 19, 15, 0.08)',
        }}
      >
        {/* Ranura simulación de Lanyard */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '6px',
              backgroundColor: 'var(--tinta)',
              borderRadius: '3px',
            }}
          />
        </div>

        {/* Encabezado del Gafete */}
        <div
          style={{
            padding: '16px 20px 12px',
            textAlign: 'center',
            borderBottom: '1px solid var(--linea)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--tinta-suave)',
            }}
          >
            EventoVivo · Campus Universitario 2026
          </span>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--tinta)',
              marginTop: '2px',
            }}
          >
            Pase de Acceso Oficial
          </div>
        </div>

        {/* Identificación del Participante */}
        <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--tinta)',
              lineHeight: 1.2,
            }}
          >
            {credential.user_name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--tinta-suave)',
              marginTop: '4px',
            }}
          >
            {credential.user_email}
          </div>

          {/* Sello de Estado */}
          <div style={{ marginTop: '10px' }}>
            {credential.has_attended ? (
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--estado-disponible)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '2px',
                }}
              >
                ✓ ASISTENCIA VERIFICADA
              </span>
            ) : credential.status === 'confirmed' ? (
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--senal)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '2px',
                  letterSpacing: '0.05em',
                }}
              >
                ACCESO CONFIRMADO
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  border: '1px dashed var(--tinta-suave)',
                  color: 'var(--tinta-suave)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  padding: '3px 8px',
                }}
              >
                LISTA DE ESPERA (PUESTO #{credential.position})
              </span>
            )}
          </div>
        </div>

        {/* Contenedor del Código QR (Alto contraste sobre blanco) */}
        <div
          style={{
            backgroundColor: 'var(--papel)',
            borderTop: '2px dashed var(--linea)',
            borderBottom: '2px dashed var(--linea)',
            padding: '24px 20px',
            textAlign: 'center',
          }}
        >
          {credential.qr_svg ? (
            <div
              style={{
                display: 'inline-block',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--linea)',
                borderRadius: '2px',
              }}
              dangerouslySetInnerHTML={{ __html: credential.qr_svg }}
            />
          ) : (
            <div style={{ padding: '30px', color: 'var(--tinta-suave)', fontSize: '13px' }}>
              QR disponible al confirmar tu plaza
            </div>
          )}

          {/* Código manual en IBM Plex Mono */}
          {credential.qr_token && (
            <div style={{ marginTop: '12px' }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--tinta-suave)',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                Código manual de 128 bits
              </span>
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--tinta)',
                  backgroundColor: 'var(--papel-calido)',
                  border: '1px solid var(--linea)',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  display: 'inline-block',
                  letterSpacing: '0.04em',
                }}
              >
                {credential.qr_token}
              </code>
            </div>
          )}
        </div>

        {/* Datos de la Sesión en el pie del gafete */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--papel-calido)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--tinta-suave)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Actividad Asignada
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tinta)', marginBottom: '8px' }}>
            {credential.session_title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--tinta-suave)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div>
              📍 <strong>{credential.session_location || 'Sala por confirmar'}</strong>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>
              🗓️ {formatDate(startDate)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>
              ⏰ {formatTime(startDate)} - {formatTime(endDate)}
            </div>
          </div>
        </div>

        {/* Registro de hora de asistencia si ya ingresó */}
        {credential.attended_at && (
          <div
            style={{
              backgroundColor: 'var(--papel)',
              borderTop: '1px solid var(--linea)',
              padding: '10px 20px',
              textAlign: 'center',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--estado-disponible)',
              fontWeight: 600,
            }}
          >
            Ingreso registrado: {new Date(credential.attended_at).toLocaleTimeString('es-ES')}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          onClick={() => window.print()}
          className="btn-outline"
          style={{ width: '100%', padding: '10px' }}
        >
          🖨️ Imprimir credencial física
        </button>
      </div>
    </main>
  );
}
