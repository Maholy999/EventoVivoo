import { describe, it, expect } from 'vitest';
import { createAuditLogEntry } from '../audit';

describe('R11 - Creación de registros de auditoría', () => {
  it('construye una entrada de auditoría con los metadatos requeridos', () => {
    const entry = createAuditLogEntry({
      entityType: 'session',
      entityId: 'session-123',
      action: 'capacity_reduction',
      changedBy: 'user-organizer-1',
      previousValue: { capacity: 30 },
      newValue: { capacity: 20 },
    });

    expect(entry.entityType).toBe('session');
    expect(entry.entityId).toBe('session-123');
    expect(entry.action).toBe('capacity_reduction');
    expect(entry.changedBy).toBe('user-organizer-1');
    expect(entry.previousValue).toEqual({ capacity: 30 });
    expect(entry.newValue).toEqual({ capacity: 20 });
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('soporta operaciones automáticas del sistema con changedBy=null', () => {
    const entry = createAuditLogEntry({
      entityType: 'enrollment',
      entityId: 'enr-456',
      action: 'automatic_promotion',
      changedBy: null,
      previousValue: { status: 'waitlisted' },
      newValue: { status: 'confirmed' },
    });

    expect(entry.changedBy).toBeNull();
    expect(entry.action).toBe('automatic_promotion');
  });
});
