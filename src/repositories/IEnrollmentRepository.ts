import { DbEnrollment, DbSession } from './types';
import { PoolClient } from 'pg';

export interface IEnrollmentRepository {
  findBySessionAndUser(sessionId: string, userId: string): Promise<DbEnrollment | null>;
  findConfirmedCountForSession(sessionId: string, client?: PoolClient): Promise<number>;
  findConfirmedSessionsForUser(userId: string): Promise<DbSession[]>;
  findWaitlistForSession(sessionId: string, client?: PoolClient): Promise<(DbEnrollment & { confirmedSessions: DbSession[] })[]>;
  createEnrollment(data: {
    session_id: string;
    user_id: string;
    status: DbEnrollment['status'];
    position?: number | null;
  }, client?: PoolClient): Promise<DbEnrollment>;
  updateEnrollmentStatus(id: string, status: DbEnrollment['status'], position?: number | null, client?: PoolClient): Promise<DbEnrollment>;
  getNextWaitlistPosition(sessionId: string, client?: PoolClient): Promise<number>;
}
