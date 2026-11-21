import { Pool, PoolClient } from 'pg';
import { IAttendanceRepository } from './IAttendanceRepository';
import { DbAttendance } from './types';

export class AttendanceRepository implements IAttendanceRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient) {
    return client || this.pool;
  }

  async findByQrToken(token: string): Promise<DbAttendance | null> {
    const res = await this.pool.query<DbAttendance>(
      'SELECT * FROM attendances WHERE qr_token = $1',
      [token]
    );
    return res.rows[0] || null;
  }

  async findByEnrollmentId(enrollmentId: string): Promise<DbAttendance | null> {
    const res = await this.pool.query<DbAttendance>(
      'SELECT * FROM attendances WHERE enrollment_id = $1',
      [enrollmentId]
    );
    return res.rows[0] || null;
  }

  async create(
    data: { enrollment_id: string; qr_token: string },
    client?: PoolClient
  ): Promise<DbAttendance> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbAttendance>(
      `INSERT INTO attendances (enrollment_id, qr_token)
       VALUES ($1, $2)
       RETURNING *`,
      [data.enrollment_id, data.qr_token]
    );
    return res.rows[0];
  }
}
