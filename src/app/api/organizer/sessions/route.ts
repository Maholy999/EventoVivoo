import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { assertOrganizer } from '@/domain/rbac';
import { validateSessionInput } from '@/domain/sessionValidation';
import { AuditRepository } from '@/repositories/AuditRepository';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertOrganizer(user);

    const body = await req.json();

    const validation = validateSessionInput({
      title: body.title,
      type: body.type,
      description: body.description,
      location: body.location,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      capacity: Number(body.capacity),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0]?.message || 'Datos de sesión inválidos', errors: validation.errors },
        { status: 400 }
      );
    }

    const status = body.status === 'published' ? 'published' : 'draft';
    const requiresApproval = Boolean(body.requires_approval);

    const insertRes = await pool.query(
      `INSERT INTO sessions (title, type, description, location, starts_at, ends_at, capacity, status, requires_approval, organizer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        body.title.trim(),
        body.type,
        body.description ? body.description.trim() : null,
        body.location ? body.location.trim() : null,
        new Date(body.starts_at),
        new Date(body.ends_at),
        Number(body.capacity),
        status,
        requiresApproval,
        user.id,
      ]
    );

    const newSession = insertRes.rows[0];

    // Registrar bitácora de auditoría (R11)
    const auditRepo = new AuditRepository(pool);
    await auditRepo.create({
      entity_type: 'session',
      entity_id: newSession.id,
      action: 'session_created',
      changed_by: user.id,
      previous_value: null,
      new_value: {
        title: newSession.title,
        type: newSession.type,
        capacity: newSession.capacity,
        status: newSession.status,
      },
    });

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.status === 401) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    }
    console.error('Error creating session:', err);
    return NextResponse.json({ error: 'Error al crear la sesión' }, { status: 500 });
  }
}
