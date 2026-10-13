import { NextResponse } from 'next/server';
import { cleanEmail, sendAccountInvite } from '@/lib/admin-users';
import {
  countActiveSuperAdmins,
  getAdminAccess,
  logAdminAction,
  requireAdmin,
} from '@/lib/auth/admin-access';
import { normalizePhone } from '@/lib/auth/session-token';
import { queryOne } from '@/lib/db';
import type { AdminRole, User } from '@/types/db';

type PatchBody = {
  action?: 'resend_invite';
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  accountStatus?: 'active' | 'suspended';
  adminRoleId?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, access, error } = await requireAdmin('users.manage');
  if (error || !user || !access) return error!;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  const target = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const targetAccess = target.role === 'admin' ? await getAdminAccess(target.id) : null;
  const isSelf = target.id === user.id;

  if (target.role === 'admin' && !isSelf) {
    if (!access.permissions.includes('roles.manage')) {
      return NextResponse.json(
        { error: 'Managing admins requires the “Roles & permissions” permission.' },
        { status: 403 },
      );
    }
    if (targetAccess?.isSuperAdmin && !access.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only a Super admin can change another Super admin.' },
        { status: 403 },
      );
    }
  }

  if (body.action === 'resend_invite') {
    if (target.accountStatus !== 'active') {
      return NextResponse.json(
        { error: 'Activate this account before sending a sign-in email.' },
        { status: 400 },
      );
    }
    const invite = await sendAccountInvite(target);
    await logAdminAction({
      actorId: user.id,
      action: 'user.resend_invite',
      targetType: 'user',
      targetId: target.id,
    });
    if (invite.warning) {
      return NextResponse.json({ error: invite.warning }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      message: `Sign-in email sent to ${invite.email}.`,
      ...(invite.devCode ? { devCode: invite.devCode } : {}),
    });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const changed: Record<string, unknown> = {};
  const set = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
    changed[column] = value;
  };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    if (name !== target.name) set('name', name);
  }

  if (body.email !== undefined) {
    const blank = !String(body.email).trim();
    const email = cleanEmail(body.email);
    if (blank && target.role !== 'admin') {
      if (target.email) set('email', null);
    } else if (!email) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
    } else if (email !== target.email) {
      set('email', email);
    }
  }

  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (phone.length < 9 || phone.length > 15) {
      return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    }
    if (phone !== target.phone) {
      const taken = await queryOne(`SELECT 1 FROM users WHERE phone = $1 AND id <> $2`, [phone, target.id]);
      if (taken) {
        return NextResponse.json({ error: 'Another account already uses this phone.' }, { status: 409 });
      }
      set('phone', phone);
    }
  }

  if (body.location !== undefined) {
    const location = body.location.trim() || null;
    if (location !== target.location) set('location', location);
  }

  if (body.accountStatus !== undefined && body.accountStatus !== target.accountStatus) {
    if (!['active', 'suspended'].includes(body.accountStatus)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    if (isSelf) {
      return NextResponse.json({ error: 'You can’t suspend your own account.' }, { status: 400 });
    }
    if (
      body.accountStatus === 'suspended' &&
      targetAccess?.isSuperAdmin &&
      (await countActiveSuperAdmins(target.id)) === 0
    ) {
      return NextResponse.json(
        { error: 'This is the last active Super admin and can’t be suspended.' },
        { status: 400 },
      );
    }
    set('account_status', body.accountStatus);
  }

  if (body.adminRoleId !== undefined && target.role === 'admin') {
    if (!access.permissions.includes('roles.manage')) {
      return NextResponse.json(
        { error: 'Changing admin roles requires the “Roles & permissions” permission.' },
        { status: 403 },
      );
    }
    if (body.adminRoleId !== targetAccess?.roleId) {
      if (isSelf) {
        return NextResponse.json({ error: 'You can’t change your own role.' }, { status: 400 });
      }
      const role = await queryOne<AdminRole>(`SELECT * FROM admin_roles WHERE id = $1`, [
        body.adminRoleId,
      ]);
      if (!role) return NextResponse.json({ error: 'Role not found.' }, { status: 400 });
      if (role.isSystem && !access.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only a Super admin can grant the Super admin role.' },
          { status: 403 },
        );
      }
      if (
        targetAccess?.isSuperAdmin &&
        !role.isSystem &&
        (await countActiveSuperAdmins(target.id)) === 0
      ) {
        return NextResponse.json(
          { error: 'This is the last Super admin. Make someone else a Super admin first.' },
          { status: 400 },
        );
      }
      set('admin_role_id', role.id);
    }
  }

  if (!updates.length) {
    return NextResponse.json({ ok: true, user: target, unchanged: true });
  }

  values.push(target.id);
  const updated = await queryOne<User>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  await logAdminAction({
    actorId: user.id,
    action: changed.account_status
      ? `user.${changed.account_status === 'suspended' ? 'suspend' : 'reactivate'}`
      : 'user.update',
    targetType: 'user',
    targetId: target.id,
    meta: changed,
  });

  return NextResponse.json({ ok: true, user: updated });
}
