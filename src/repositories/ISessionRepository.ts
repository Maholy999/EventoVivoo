import { DbSession, SessionStatus } from './types';
import { PoolClient } from 'pg';

export interface ISessionRepository {
  findById(id: string): Promise<DbSession | null>;
  findByIdForUpdate(id: string, client: PoolClient): Promise<DbSession | null>;
  findPublished(): Promise<DbSession[]>;
  updateCapacity(id: string, newCapacity: number, client?: PoolClient): Promise<DbSession>;
  updateSchedule(
    id: string,
    startsAt: Date,
    endsAt: Date,
    location?: string | null,
    client?: PoolClient
  ): Promise<DbSession>;
  updateStatus(id: string, status: SessionStatus, client?: PoolClient): Promise<DbSession>;
  getAttendanceCount(id: string, client?: PoolClient): Promise<number>;
  getConfirmedAttendees(
    id: string,
    client?: PoolClient
  ): Promise<{ id: string; userId: string; enrolledAt: Date }[]>;
}
