import { DbAttendance } from './types';
import { PoolClient } from 'pg';

export interface IAttendanceRepository {
  findByQrToken(token: string): Promise<DbAttendance | null>;
  findByEnrollmentId(enrollmentId: string): Promise<DbAttendance | null>;
  create(data: {
    enrollment_id: string;
    qr_token: string;
  }, client?: PoolClient): Promise<DbAttendance>;
}
