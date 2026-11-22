'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Encuesta de Satisfacción según R10 y R18:
 * - Solo se ofrece si el participante tiene asistencia registrada (verificado en servidor con 403).
 * - Opcional, calificación 1 a 5 y comentario.
 */
export default function SurveyPage() {
  const params = useParams();
  const enrollmentId = params?.id as string;
  const router = useRouter();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId,
          rating,
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Error al enviar la encuesta', isError: true });
      } else {
        setMessage({ text: data.message, isError: false });
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch {
      setMessage({ text: 'Error de conexión al enviar la encuesta', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '480px', padding: '30px 16px 80px' }}>
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
          padding: '24px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--tinta-suave)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Evaluación de la Experiencia (R10, R18)
        </span>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 12px' }}>
          Encuesta de Satisfacción
        </h1>
        <p style={{ color: 'var(--tinta-suave)', fontSize: '13px', lineHeight: 1.4, marginBottom: '20px' }}>
          Solo los asistentes verificados pueden enviar su retroalimentación para ayudarnos a calibrar las próximas sesiones universitarias.
        </p>

        {message && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              marginBottom: '20px',
              backgroundColor: message.isError ? '#FFF5F2' : '#F4FBF7',
              border: `1px solid ${message.isError ? 'var(--senal)' : 'var(--estado-disponible)'}`,
              color: message.isError ? 'var(--senal)' : 'var(--estado-disponible)',
              fontWeight: 600,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              Calificación general *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: '1px solid var(--tinta)',
                    backgroundColor: rating >= star ? 'var(--tinta)' : 'var(--papel)',
                    color: rating >= star ? '#FFFFFF' : 'var(--tinta)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '2px',
                  }}
                >
                  ★ {star}
                </button>
              ))}
            </div>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--tinta-suave)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              1 = Muy insatisfecho · 5 = Excelente
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Comentario u observaciones (opcional)
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te pareció el contenido, la dinámica y el ponente?..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--tinta)',
                fontSize: '13px',
                backgroundColor: 'var(--papel)',
                color: 'var(--tinta)',
                lineHeight: 1.4,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-senal"
            style={{ width: '100%', padding: '12px', fontSize: '14px' }}
          >
            {loading ? 'Enviando…' : 'Enviar evaluación'}
          </button>
        </form>
      </div>
    </main>
  );
}
