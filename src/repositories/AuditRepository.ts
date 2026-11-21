import { Pool, PoolClient } from 'pg';
import { IAuditRepository, DbAuditLog } from './IAuditRepository';

export class AuditRepository implements IAuditRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient) {
    return client || this.pool;
  }

  async create(
    data: {
      entity_type: string;
      entity_id: string;
      action: string;
      changed_by: string | null;
      previous_value: unknown;
      new_value: unknown;
    },
    client?: PoolClient
  ): Promise<DbAuditLog> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbAuditLog>(
      `INSERT INTO audit_logs (entity_type, entity_id, action, changed_by, previous_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.entity_type,
        data.entity_id,
        data.action,
        data.changed_by,
        JSON.stringify(data.previous_value),
        JSON.stringify(data.new_value),
      ]
    );
    return res.rows[0];
  }

  async findByEntity(entityType: string, entityId: string): Promise<DbAuditLog[]> {
    const res = await this.pool.query<DbAuditLog>(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId]
    );
    return res.rows;
  }
}
