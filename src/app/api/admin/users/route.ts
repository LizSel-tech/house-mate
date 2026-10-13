import { NextResponse } from 'next/server';
import { cleanEmail, sendAccountInvite } from '@/lib/admin-users';
import { logAdminAction, requireAdmin } from '@/lib/auth/admin-access';
import { normalizePhone } from '@/lib/auth/session-token';
import { query, queryData, queryOne } from '@/lib/db';
import type { AdminRole, User, UserRole } from '@/types/db';

export async function GET(request: Request) {
  const { user, error } = await requireAdmin(['users.manage', 'roles.manage']);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  const filterRole =
    role && role !== 'all' && ['user', 'artisan', 'admin'].includes(role)
      ? (role as UserRole)
      : null;

  const users = await queryData(
    `SELECT to_jsonb(u) || jsonb_build_object(
       'artisan_profile', CASE WHEN ap.id IS NULL THEN NULL ELSE to_jsonb(ap) END,
       'admin_role', CASE WHEN u.role <> 'admin' THEN NULL
         WHEN r.id IS NULL THEN jsonb_build_object('name', 'Super admin', 'is_system', true)
         ELSE jsonb_build_object('id', r.id, 'name', r.name, 'is_system', r.is_system) END,
       'bookings_made', (SELECT count(*) FROM bookings bm WHERE bm.user_id = u.id),
       'jobs_received', CASE WHEN ap.id IS NULL THEN 0
         ELSE (SELECT count(*) FROM bookings bj WHERE bj.artisan_id = ap.id) END
     ) AS data
     FROM users u
     LEFT JOIN artisan_profiles ap ON ap.user_id = u.id
     LEFT JOIN admin_roles r ON r.id = u.admin_role_id
     ${filterRole ? 'WHERE u.role = $1' : ''}
     ORDER BY u.created_at DESC
     LIMIT 500`,
    filterRole ? [filterRole] : [],
  );

  const counts = await query<{ role: UserRole; count: string }>(
    `SELECT role, count(*)::text AS count FROM users GROUP BY role`,
  );

  const summary = { all: 0, user: 0, artisan: 0, admin: 0 };
  for (const row of counts) {
    summary[row.role] = Number(row.count);
    summary.all += Number(row.count);
  }

  return NextResponse.json({ users, summary });
}

/** Creates an admin staff account. Clients and providers sign up themselves. */
export async function POST(request: Request) {
  const { user, access, error } = await requireAdmin('roles.manage');
  if (error || !user || !access) return error!;

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    email?: string;
    location?: string;
    adminRoleId?: string;
    sendInvite?: boolean;
  };

  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Enter a name.' }, { status: 400 });

  const phone = normalizePhone(String(body.phone || ''));
  if (phone.length < 9 || phone.length > 15) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  }

  const email = cleanEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { error: 'Enter a valid email. Admins receive their sign-in code by email.' },
      { status: 400 },
    );
  }

  const role = body.adminRoleId
    ? await queryOne<AdminRole>(`SELECT * FROM admin_roles WHERE id = $1`, [body.adminRoleId])
    : null;
  if (!role) return NextResponse.json({ error: 'Choose a role for this admin.' }, { status: 400 });
  if (role.isSystem && !access.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Only a Super admin can create another Super admin.' },
      { status: 403 },
    );
  }

  const taken = await queryOne(`SELECT 1 FROM users WHERE phone = $1`, [phone]);
  if (taken) {
    return NextResponse.json({ error: 'An account with this phone already exists.' }, { status: 409 });
  }

  const created = await queryOne<User>(
    `INSERT INTO users (name, phone, email, role, location, account_status, admin_role_id, created_by)
     VALUES ($1, $2, $3, 'admin', $4, 'active', $5, $6)
     RETURNING *`,
    [name, phone, email, String(body.location || '').trim() || null, role.id, user.id],
  );
  if (!created) return NextResponse.json({ error: 'Could not create this user.' }, { status: 500 });

  await logAdminAction({
    actorId: user.id,
    action: 'admin.create',
    targetType: 'user',
    targetId: created.id,
    meta: { name, role: role.name },
  });

  let invite: { sent: boolean; email?: string; warning?: string } | null = null;
  let devCode: string | undefined;
  if (body.sendInvite !== false) {
    const result = await sendAccountInvite(created);
    invite = { sent: !result.warning, email: result.email, warning: result.warning };
    devCode = result.devCode;
  }

  return NextResponse.json({ ok: true, user: created, invite, ...(devCode ? { devCode } : {}) });
}
