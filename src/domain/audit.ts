export interface AuditEntry<T = unknown> {
  entityType: 'session' | 'enrollment';
  entityId: string;
  action:
    | 'capacity_reduction'
    | 'rescheduled'
    | 'session_cancelled'
    | 'session_published'
    | 'automatic_promotion'
    | 'manual_promotion';
  changedBy: string | null; // null si es automático por el sistema
  previousValue: T;
  newValue: T;
  createdAt: Date;
}

/**
 * R11: Construye una entrada de auditoría inmutable con trazabilidad completa.
 */
export function createAuditLogEntry<T>(params: {
  entityType: 'session' | 'enrollment';
  entityId: string;
  action: AuditEntry['action'];
  changedBy: string | null;
  previousValue: T;
  newValue: T;
}): AuditEntry<T> {
  return {
    ...params,
    createdAt: new Date(),
  };
}
