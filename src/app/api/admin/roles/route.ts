import { NextResponse } from 'next/server';
import { parseRoleInput } from '@/lib/admin-roles';
import { logAdminAction, requireAdmin } from '@/lib/auth/admin-access';
import { query, queryOne } from '@/lib/db';
import type { AdminRole } from '@/types/db';

export async function GET() {
  const { user, error } = await requireAdmin(['roles.manage', 'users.manage']);
  if (error || !user) return error!;

  const roles = await query<AdminRole & { memberCount: string }>(
    `SELECT r.*, (SELECT count(*) FROM users u WHERE u.admin_role_id = r.id)::text AS member_count
       FROM admin_roles r
      ORDER BY r.is_system DESC, r.name ASC`,
  );

  return NextResponse.json({
    roles: roles.map((r) => ({ ...r, memberCount: Number(r.memberCount) })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await requireAdmin('roles.manage');
  if (error || !user) return error!;

  const parsed = parseRoleInput(await request.json().catch(() => ({})));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const clash = await queryOne(`SELECT 1 FROM admin_roles WHERE lower(name) = lower($1)`, [parsed.name]);
  if (clash) return NextResponse.json({ error: 'A role with this name already exists.' }, { status: 409 });

  const role = await queryOne<AdminRole>(
    `INSERT INTO admin_roles (name, description, permissions, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [parsed.name, parsed.description, parsed.permissions, user.id],
  );

  await logAdminAction({
    actorId: user.id,
    action: 'role.create',
    targetType: 'admin_role',
    targetId: role?.id,
    meta: { name: parsed.name, permissions: parsed.permissions },
  });

  return NextResponse.json({ ok: true, role });
}
