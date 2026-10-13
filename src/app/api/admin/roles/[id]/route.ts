import { NextResponse } from 'next/server';
import { parseRoleInput } from '@/lib/admin-roles';
import { logAdminAction, requireAdmin } from '@/lib/auth/admin-access';
import { query, queryOne } from '@/lib/db';
import type { AdminRole } from '@/types/db';

async function loadEditableRole(id: string) {
  const role = await queryOne<AdminRole>(`SELECT * FROM admin_roles WHERE id = $1`, [id]);
  if (!role) return { error: NextResponse.json({ error: 'Role not found.' }, { status: 404 }) };
  if (role.isSystem) {
    return {
      error: NextResponse.json(
        { error: 'The Super admin role is built in and can’t be changed.' },
        { status: 400 },
      ),
    };
  }
  return { role };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAdmin('roles.manage');
  if (error || !user) return error!;

  const { id } = await context.params;
  const loaded = await loadEditableRole(id);
  if (loaded.error) return loaded.error;

  const parsed = parseRoleInput(await request.json().catch(() => ({})));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const clash = await queryOne(
    `SELECT 1 FROM admin_roles WHERE lower(name) = lower($1) AND id <> $2`,
    [parsed.name, id],
  );
  if (clash) return NextResponse.json({ error: 'A role with this name already exists.' }, { status: 409 });

  const role = await queryOne<AdminRole>(
    `UPDATE admin_roles
        SET name = $1, description = $2, permissions = $3, updated_at = now()
      WHERE id = $4
      RETURNING *`,
    [parsed.name, parsed.description, parsed.permissions, id],
  );

  await logAdminAction({
    actorId: user.id,
    action: 'role.update',
    targetType: 'admin_role',
    targetId: id,
    meta: { name: parsed.name, permissions: parsed.permissions },
  });

  return NextResponse.json({ ok: true, role });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAdmin('roles.manage');
  if (error || !user) return error!;

  const { id } = await context.params;
  const loaded = await loadEditableRole(id);
  if (loaded.error) return loaded.error;

  const members = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM users WHERE admin_role_id = $1`,
    [id],
  );
  if (Number(members?.count || 0) > 0) {
    return NextResponse.json(
      { error: 'Move the admins in this role to another role before deleting it.' },
      { status: 400 },
    );
  }

  await query(`DELETE FROM admin_roles WHERE id = $1`, [id]);
  await logAdminAction({
    actorId: user.id,
    action: 'role.delete',
    targetType: 'admin_role',
    targetId: id,
    meta: { name: loaded.role!.name },
  });

  return NextResponse.json({ ok: true });
}
