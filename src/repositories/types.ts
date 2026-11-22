export type SessionStatus = 'draft' | 'published' | 'cancelled';
export type SessionType = 'taller' | 'hackatón' | 'conferencia' | 'encuentro';
export type EnrollmentStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'pending';
export type UserRole = 'participant' | 'organizer';

export interface DbSession {
  id: string;
  title: string;
  type: SessionType;
  description: string | null;
  location: string | null;
  capacity: number;
  starts_at: Date;
  ends_at: Date;
  status: SessionStatus;
  organizer_id: string;
  requires_approval?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SessionWithCounts extends DbSession {
  confirmed_count: number;
  waitlisted_count: number;
  attended_count: number;
}

export interface SessionWithStats extends SessionWithCounts {
  survey_avg: number;
  survey_count: number;
}

export interface DbEnrollment {
  id: string;
  session_id: string;
  user_id: string;
  status: EnrollmentStatus;
  position: number | null;
  enrolled_at: Date;
  updated_at: Date;
}

export interface DbAttendance {
  id: string;
  enrollment_id: string;
  qr_token: string;
  recorded_at: Date;
}
