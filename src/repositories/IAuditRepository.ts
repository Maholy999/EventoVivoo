import { PoolClient } from 'pg';

export interface DbAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by: string | null;
  previous_value: unknown;
  new_value: unknown;
  created_at: Date;
}

export interface IAuditRepository {
  create(
    data: {
      entity_type: string;
      entity_id: string;
      action: string;
      changed_by: string | null;
      previous_value: unknown;
      new_value: unknown;
    },
    client?: PoolClient
  ): Promise<DbAuditLog>;

  findByEntity(entityType: string, entityId: string): Promise<DbAuditLog[]>;
}
