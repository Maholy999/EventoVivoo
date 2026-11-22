import { Pool, PoolClient } from 'pg';
import { ISessionRepository } from './ISessionRepository';
import { DbSession, SessionStatus, SessionWithCounts, SessionWithStats } from './types';

export class SessionRepository implements ISessionRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient) {
    return client || this.pool;
  }

  async findById(id: string): Promise<DbSession | null> {
    const res = await this.pool.query<DbSession>(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async findByIdForUpdate(id: string, client: PoolClient): Promise<DbSession | null> {
    const res = await client.query<DbSession>(
      'SELECT * FROM sessions WHERE id = $1 FOR UPDATE',
      [id]
    );
    return res.rows[0] || null;
  }

  async findPublished(): Promise<DbSession[]> {
    const res = await this.pool.query<DbSession>(
      "SELECT * FROM sessions WHERE status = 'published' ORDER BY starts_at ASC"
    );
    return res.rows;
  }

  async findPublishedWithCounts(): Promise<SessionWithCounts[]> {
    const res = await this.pool.query<SessionWithCounts>(
      `SELECT 
        s.*,
        COALESCE(e.confirmed_count, 0)::int AS confirmed_count,
        COALESCE(e.waitlisted_count, 0)::int AS waitlisted_count,
        COALESCE(a.attended_count, 0)::int AS attended_count
      FROM sessions s
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
          COUNT(*) FILTER (WHERE status = 'waitlisted') AS waitlisted_count
        FROM enrollments
        GROUP BY session_id
      ) e ON e.session_id = s.id
      LEFT JOIN (
        SELECT 
          e.session_id,
          COUNT(a.id) AS attended_count
        FROM enrollments e
        JOIN attendances a ON a.enrollment_id = e.id
        WHERE a.recorded_at IS NOT NULL
        GROUP BY e.session_id
      ) a ON a.session_id = s.id
      WHERE s.status = 'published'
      ORDER BY s.starts_at ASC`
    );
    return res.rows;
  }

  async findByOrganizerWithStats(organizerId: string): Promise<SessionWithStats[]> {
    const res = await this.pool.query<SessionWithStats>(
      `SELECT 
        s.*,
        COALESCE(e.confirmed_count, 0)::int AS confirmed_count,
        COALESCE(e.waitlisted_count, 0)::int AS waitlisted_count,
        COALESCE(a.attended_count, 0)::int AS attended_count,
        COALESCE(sv.survey_avg, 0)::float AS survey_avg,
        COALESCE(sv.survey_count, 0)::int AS survey_count
      FROM sessions s
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
          COUNT(*) FILTER (WHERE status = 'waitlisted') AS waitlisted_count
        FROM enrollments
        GROUP BY session_id
      ) e ON e.session_id = s.id
      LEFT JOIN (
        SELECT 
          e.session_id,
          COUNT(a.id) AS attended_count
        FROM enrollments e
        JOIN attendances a ON a.enrollment_id = e.id
        WHERE a.recorded_at IS NOT NULL
        GROUP BY e.session_id
      ) a ON a.session_id = s.id
      LEFT JOIN (
        SELECT 
          e.session_id,
          ROUND(AVG(sv.rating), 2) AS survey_avg,
          COUNT(sv.id) AS survey_count
        FROM enrollments e
        JOIN surveys sv ON sv.enrollment_id = e.id
        GROUP BY e.session_id
      ) sv ON sv.session_id = s.id
      WHERE s.organizer_id = $1
      ORDER BY s.starts_at ASC`,
      [organizerId]
    );
    return res.rows;
  }

  async updateCapacity(
    id: string,
    newCapacity: number,
    client?: PoolClient
  ): Promise<DbSession> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbSession>(
      'UPDATE sessions SET capacity = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [newCapacity, id]
    );
    return res.rows[0];
  }

  async updateSchedule(
    id: string,
    startsAt: Date,
    endsAt: Date,
    location?: string | null,
    client?: PoolClient
  ): Promise<DbSession> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbSession>(
      `UPDATE sessions
       SET starts_at = $1, ends_at = $2, location = COALESCE($3, location), updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [startsAt, endsAt, location ?? null, id]
    );
    return res.rows[0];
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    client?: PoolClient
  ): Promise<DbSession> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbSession>(
      'UPDATE sessions SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return res.rows[0];
  }

  async getAttendanceCount(id: string, client?: PoolClient): Promise<number> {
    const executor = this.getExecutor(client);
    const res = await executor.query<{ count: string }>(
      `SELECT COUNT(a.id) as count
       FROM attendances a
       JOIN enrollments e ON e.id = a.enrollment_id
       WHERE e.session_id = $1`,
      [id]
    );
    return parseInt(res.rows[0].count, 10);
  }

  async getConfirmedAttendees(
    id: string,
    client?: PoolClient
  ): Promise<{ id: string; userId: string; enrolledAt: Date }[]> {
    const executor = this.getExecutor(client);
    const res = await executor.query<{
      id: string;
      user_id: string;
      enrolled_at: Date;
    }>(
      `SELECT id, user_id, enrolled_at
       FROM enrollments
       WHERE session_id = $1 AND status = 'confirmed'
       ORDER BY enrolled_at ASC`,
      [id]
    );
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      enrolledAt: r.enrolled_at,
    }));
  }
}
