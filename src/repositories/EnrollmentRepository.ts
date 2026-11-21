import { Pool, PoolClient } from 'pg';
import { IEnrollmentRepository } from './IEnrollmentRepository';
import { DbEnrollment, DbSession } from './types';

export class EnrollmentRepository implements IEnrollmentRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient) {
    return client || this.pool;
  }

  async findBySessionAndUser(sessionId: string, userId: string): Promise<DbEnrollment | null> {
    const res = await this.pool.query<DbEnrollment>(
      'SELECT * FROM enrollments WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    return res.rows[0] || null;
  }

  async findConfirmedCountForSession(sessionId: string, client?: PoolClient): Promise<number> {
    const executor = this.getExecutor(client);
    const res = await executor.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM enrollments WHERE session_id = $1 AND status = 'confirmed'",
      [sessionId]
    );
    return parseInt(res.rows[0].count, 10);
  }

  async findConfirmedSessionsForUser(userId: string): Promise<DbSession[]> {
    const res = await this.pool.query<DbSession>(
      `SELECT s.* FROM sessions s
       JOIN enrollments e ON e.session_id = s.id
       WHERE e.user_id = $1 AND e.status = 'confirmed'`,
      [userId]
    );
    return res.rows;
  }

  async findWaitlistForSession(
    sessionId: string,
    client?: PoolClient
  ): Promise<(DbEnrollment & { confirmedSessions: DbSession[] })[]> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbEnrollment>(
      "SELECT * FROM enrollments WHERE session_id = $1 AND status = 'waitlisted' ORDER BY position ASC",
      [sessionId]
    );

    const result: (DbEnrollment & { confirmedSessions: DbSession[] })[] = [];
    for (const enrollment of res.rows) {
      const confRes = await executor.query<DbSession>(
        `SELECT s.* FROM sessions s
         JOIN enrollments e ON e.session_id = s.id
         WHERE e.user_id = $1 AND e.status = 'confirmed' AND s.id != $2`,
        [enrollment.user_id, sessionId]
      );
      result.push({
        ...enrollment,
        confirmedSessions: confRes.rows,
      });
    }
    return result;
  }

  async createEnrollment(
    data: {
      session_id: string;
      user_id: string;
      status: DbEnrollment['status'];
      position?: number | null;
    },
    client?: PoolClient
  ): Promise<DbEnrollment> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbEnrollment>(
      `INSERT INTO enrollments (session_id, user_id, status, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.session_id, data.user_id, data.status, data.position ?? null]
    );
    return res.rows[0];
  }

  async updateEnrollmentStatus(
    id: string,
    status: DbEnrollment['status'],
    position?: number | null,
    client?: PoolClient
  ): Promise<DbEnrollment> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbEnrollment>(
      `UPDATE enrollments
       SET status = $1, position = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [status, position ?? null, id]
    );
    return res.rows[0];
  }

  async getNextWaitlistPosition(sessionId: string, client?: PoolClient): Promise<number> {
    const executor = this.getExecutor(client);
    const res = await executor.query<{ next_pos: number }>(
      `SELECT COALESCE(MAX(position), 0) + 1 as next_pos
       FROM enrollments
       WHERE session_id = $1 AND status = 'waitlisted'`,
      [sessionId]
    );
    return Number(res.rows[0].next_pos);
  }
}
