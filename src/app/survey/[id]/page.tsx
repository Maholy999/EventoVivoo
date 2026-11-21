'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div className="container" style={{ maxWidth: '520px', padding: '30px 20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>
          &larr; Volver a la Agenda
        </Link>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--primary)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Evaluación de la Experiencia (R10)
        </span>
        <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 16px' }}>
          Encuesta de Satisfacción
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Tu retroalimentación nos ayuda a mejorar los próximos talleres y hackatones universitarios.
        </p>

        {message && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '20px',
              background: message.isError ? 'rgba(231, 76, 60, 0.15)' : 'rgba(72, 229, 194, 0.15)',
              border: `1px solid ${message.isError ? 'var(--accent-red)' : 'var(--primary)'}`,
              color: message.isError ? 'var(--accent-red)' : 'var(--primary)',
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              Calificación General (1 a 5 estrellas):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: rating >= star ? 'var(--primary)' : 'var(--surface-card)',
                    color: rating >= star ? 'var(--bg-main)' : 'var(--text-muted)',
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ★ {star}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              Comentario opcional:
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te pareció el contenido, la dinámica y el instructor?"
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                color: 'var(--text-light)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '12px', fontSize: '1rem', width: '100%' }}
          >
            {loading ? 'Enviando...' : 'Enviar Encuesta'}
          </button>
        </form>
      </div>
    </div>
  );
}
