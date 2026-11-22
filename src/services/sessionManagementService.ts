import { Pool } from 'pg';
import { ISessionRepository } from '@/repositories/ISessionRepository';
import { IEnrollmentRepository } from '@/repositories/IEnrollmentRepository';
import { IAuditRepository } from '@/repositories/IAuditRepository';
import { INotificationRepository } from '@/repositories/INotificationRepository';
import { calculateCapacityReduction } from '@/domain/capacityReduction';
import { revalidateScheduleConflicts } from '@/domain/reschedule';
import { canTransitionSessionState } from '@/domain/sessionState';
import { TimeSlot } from '@/domain/schedule';

export class SessionManagementService {
  constructor(
    private pool: Pool,
    private sessionRepo: ISessionRepository,
    private enrollmentRepo: IEnrollmentRepository,
    private auditRepo: IAuditRepository,
    private notificationRepo: INotificationRepository
  ) {}

  /**
   * R7, R11, F8: Reducción de aforo con política LIFO y auditoría
   */
  async reduceCapacity(params: {
    sessionId: string;
    newCapacity: number;
    changedBy: string;
  }): Promise<{
    success: boolean;
    error?: string;
    demotedCount?: number;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const session = await this.sessionRepo.findByIdForUpdate(params.sessionId, client);
      if (!session) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Sesión no encontrada' };
      }

      // R14: Solo el organizador propietario puede modificar su sesión
      if (session.organizer_id !== params.changedBy) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Acceso denegado: no tienes permisos para modificar sesiones ajenas (R14)',
        };
      }

      const attendanceCount = await this.sessionRepo.getAttendanceCount(params.sessionId, client);
      const confirmedAttendees = await this.sessionRepo.getConfirmedAttendees(params.sessionId, client);
      const waitlist = await this.enrollmentRepo.findWaitlistForSession(params.sessionId, client);

      const existingWaitlist = waitlist.map((w) => ({
        id: w.id,
        userId: w.user_id,
        position: w.position || 0,
      }));

      const { plan, error } = calculateCapacityReduction(
        params.newCapacity,
        confirmedAttendees,
        existingWaitlist,
        attendanceCount
      );

      if (error === 'CAPACITY_BELOW_ATTENDANCE') {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `No se puede reducir el aforo por debajo de las asistencias ya registradas (${attendanceCount})`,
        };
      }

      if (error === 'INVALID_CAPACITY' || !plan) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Aforo inválido' };
      }

      // Actualizar aforo de la sesión
      await this.sessionRepo.updateCapacity(params.sessionId, params.newCapacity, client);

      // Desplazar lista de espera existente
      for (const item of plan.shiftedWaitlist) {
        await this.enrollmentRepo.updateEnrollmentStatus(
          item.id,
          'waitlisted',
          item.newPosition,
          client
        );
      }

      // Degradar últimos confirmados a la cabecera de la lista de espera
      for (const item of plan.demotedToWaitlist) {
        await this.enrollmentRepo.updateEnrollmentStatus(
          item.id,
          'waitlisted',
          item.newPosition,
          client
        );

        // F8: Aviso en app a los degradados
        await this.notificationRepo.create(
          {
            user_id: item.userId,
            message: `El aforo de la sesión "${session.title}" se redujo. Pasaste a la posición ${item.newPosition} de la lista de espera.`,
            type: 'waitlisted',
            session_id: session.id,
          },
          client
        );
      }

      // R11: Bitácora de auditoría
      await this.auditRepo.create(
        {
          entity_type: 'session',
          entity_id: session.id,
          action: 'capacity_reduction',
          changed_by: params.changedBy,
          previous_value: { capacity: session.capacity },
          new_value: { capacity: params.newCapacity, demotedCount: plan.demotedToWaitlist.length },
        },
        client
      );

      await client.query('COMMIT');
      return { success: true, demotedCount: plan.demotedToWaitlist.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * R8, R11, F8: Reprogramación de sesión con revalidación de choques y avisos
   */
  async rescheduleSession(params: {
    sessionId: string;
    newSlot: TimeSlot;
    newLocation?: string;
    changedBy: string;
  }): Promise<{
    success: boolean;
    error?: string;
    affectedUserIds?: string[];
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const session = await this.sessionRepo.findByIdForUpdate(params.sessionId, client);
      if (!session) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Sesión no encontrada' };
      }

      // R14: Solo el organizador propietario puede modificar su sesión
      if (session.organizer_id !== params.changedBy) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Acceso denegado: no tienes permisos para modificar sesiones ajenas (R14)',
        };
      }

      const confirmedAttendees = await this.sessionRepo.getConfirmedAttendees(params.sessionId, client);

      const attendeesWithSchedule = await Promise.all(
        confirmedAttendees.map(async (att) => {
          const otherSessions = await this.enrollmentRepo.findConfirmedSessionsForUser(att.userId);
          const filtered = otherSessions.filter((s) => s.id !== params.sessionId);
          return {
            userId: att.userId,
            enrollmentId: att.id,
            otherConfirmedSlots: filtered.map((s) => ({
              starts_at: s.starts_at,
              ends_at: s.ends_at,
            })),
          };
        })
      );

      const conflictResult = revalidateScheduleConflicts(params.newSlot, attendeesWithSchedule);

      await this.sessionRepo.updateSchedule(
        params.sessionId,
        params.newSlot.starts_at,
        params.newSlot.ends_at,
        params.newLocation,
        client
      );

      // F8: Notificar a todos los inscritos confirmados
      for (const att of confirmedAttendees) {
        const isConflict = conflictResult.affectedUserIds.includes(att.userId);
        const msg = isConflict
          ? `AVISO DE TRASLAPE: La sesión "${session.title}" fue reprogramada y ahora se traslapa con otra de tus sesiones confirmadas.`
          : `La sesión "${session.title}" ha sido reprogramada para un nuevo horario.`;

        await this.notificationRepo.create(
          {
            user_id: att.userId,
            message: msg,
            type: 'schedule_change',
            session_id: session.id,
          },
          client
        );
      }

      // R11: Auditoría
      await this.auditRepo.create(
        {
          entity_type: 'session',
          entity_id: session.id,
          action: 'rescheduled',
          changed_by: params.changedBy,
          previous_value: {
            starts_at: session.starts_at,
            ends_at: session.ends_at,
            location: session.location,
          },
          new_value: {
            starts_at: params.newSlot.starts_at,
            ends_at: params.newSlot.ends_at,
            location: params.newLocation ?? session.location,
            affectedUserIds: conflictResult.affectedUserIds,
          },
        },
        client
      );

      await client.query('COMMIT');
      return { success: true, affectedUserIds: conflictResult.affectedUserIds };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * R12, R11, F8: Cancelación de sesión con avisos a inscritos y en espera
   */
  async cancelSession(params: {
    sessionId: string;
    changedBy: string;
  }): Promise<{ success: boolean; error?: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const session = await this.sessionRepo.findByIdForUpdate(params.sessionId, client);
      if (!session) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Sesión no encontrada' };
      }

      // R14: Solo el organizador propietario puede modificar su sesión
      if (session.organizer_id !== params.changedBy) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Acceso denegado: no tienes permisos para modificar sesiones ajenas (R14)',
        };
      }

      const transition = canTransitionSessionState(session.status, 'cancelled');
      if (!transition.allowed) {
        await client.query('ROLLBACK');
        return { success: false, error: transition.error };
      }

      await this.sessionRepo.updateStatus(params.sessionId, 'cancelled', client);

      // Obtener todos los inscritos confirmados y en espera para avisarles
      const confirmed = await this.sessionRepo.getConfirmedAttendees(params.sessionId, client);
      const waitlist = await this.enrollmentRepo.findWaitlistForSession(params.sessionId, client);

      const allAffectedUserIds = [
        ...confirmed.map((c) => c.userId),
        ...waitlist.map((w) => w.user_id),
      ];

      for (const userId of allAffectedUserIds) {
        await this.notificationRepo.create(
          {
            user_id: userId,
            message: `La sesión "${session.title}" ha sido cancelada por el organizador.`,
            type: 'session_cancelled',
            session_id: session.id,
          },
          client
        );
      }

      // R11: Auditoría
      await this.auditRepo.create(
        {
          entity_type: 'session',
          entity_id: session.id,
          action: 'session_cancelled',
          changed_by: params.changedBy,
          previous_value: { status: session.status },
          new_value: { status: 'cancelled' },
        },
        client
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * R12, R11: Publicar sesión en borrador
   */
  async publishSession(params: {
    sessionId: string;
    changedBy: string;
  }): Promise<{ success: boolean; error?: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const session = await this.sessionRepo.findByIdForUpdate(params.sessionId, client);
      if (!session) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Sesión no encontrada' };
      }

      // R14: Solo el organizador propietario puede modificar su sesión
      if (session.organizer_id !== params.changedBy) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Acceso denegado: no tienes permisos para modificar sesiones ajenas (R14)',
        };
      }

      const transition = canTransitionSessionState(session.status, 'published');
      if (!transition.allowed) {
        await client.query('ROLLBACK');
        return { success: false, error: transition.error };
      }

      await this.sessionRepo.updateStatus(params.sessionId, 'published', client);

      // R11: Auditoría
      await this.auditRepo.create(
        {
          entity_type: 'session',
          entity_id: session.id,
          action: 'session_published',
          changed_by: params.changedBy,
          previous_value: { status: session.status },
          new_value: { status: 'published' },
        },
        client
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
