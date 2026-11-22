'use client';

interface SegmentedMeterProps {
  capacity: number;
  confirmed: number;
  waitlisted?: number;
  compact?: boolean;
}

/**
 * Barra de aforo segmentada según Sección 2 de la Guía de Arte:
 * "Barra de aforo segmentada (una marca por cada 5 plazas) en vez de barra redondeada genérica."
 */
export function SegmentedMeter({
  capacity,
  confirmed,
  waitlisted = 0,
  compact = false,
}: SegmentedMeterProps) {
  const safeCap = Math.max(1, capacity);
  const totalSegments = Math.max(1, Math.ceil(safeCap / 5));
  const filledSegments = Math.min(
    totalSegments,
    Math.ceil((confirmed / safeCap) * totalSegments)
  );
  const occupancyPct = Math.round((confirmed / safeCap) * 100);

  const isFull = confirmed >= safeCap;
  const isNearFull = !isFull && occupancyPct >= 90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
            {confirmed} / {safeCap} plazas ({occupancyPct}%)
          </span>
          {waitlisted > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#5E584F',
                fontSize: '11px',
              }}
            >
              +{waitlisted} en espera
            </span>
          )}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalSegments}, minmax(4px, 1fr))`,
          gap: '2px',
          height: compact ? '6px' : '9px',
          background: 'transparent',
        }}
      >
        {Array.from({ length: totalSegments }).map((_, idx) => {
          const isFilled = idx < filledSegments;
          let segmentBg = '#DDD7CC'; // --linea
          if (isFilled) {
            segmentBg = isFull ? '#16130F' : isNearFull ? '#B7700B' : '#1E6B4F';
          }
          return (
            <div
              key={idx}
              title={`Segmento ${idx + 1} de ${totalSegments} (~5 cupos)`}
              style={{
                height: '100%',
                backgroundColor: segmentBg,
                borderRadius: '1px',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
