import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission,
} from '@/lib/admin-permissions';
import type { SessionUser } from '@/types/auth';

export type AdminAccess = {
  roleId: string | null;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  accountStatus: string;
};

type AccessRow = {
  accountStatus: string;
  adminRoleId: string | null;
  roleName: string | null;
  isSystem: boolean | null;
  permissions: string[] | null;
};

/** Loads the admin's role from the database so permission changes apply without re-login. */
export async function getAdminAccess(userId: string): Promise<AdminAccess | null> {
  const row = await queryOne<AccessRow>(
    `SELECT u.account_status, u.admin_role_id, r.name AS role_name, r.is_system, r.permissions
       FROM users u
       LEFT JOIN admin_roles r ON r.id = u.admin_role_id
      WHERE u.id = $1 AND u.role = 'admin'`,
    [userId],
  );
  if (!row) return null;

  // Admins with no role (created before roles existed, or the demo admin) keep full access.
  const isSuperAdmin = !row.adminRoleId || Boolean(row.isSystem);
  const permissions = isSuperAdmin
    ? [...ALL_ADMIN_PERMISSIONS]
    : (row.permissions || []).filter((p): p is AdminPermission =>
        (ALL_ADMIN_PERMISSIONS as string[]).includes(p),
      );

  return {
    roleId: row.adminRoleId,
    roleName: row.roleName || 'Super admin',
    isSuperAdmin,
    permissions,
    accountStatus: row.accountStatus,
  };
}

/**
 * Admin route guard. Pass one permission, or several where any one is enough.
 * Suspended admins are rejected even if their session cookie is still valid.
 */
export async function requireAdmin(permission?: AdminPermission | AdminPermission[]) {
  const user = await getSession();
  const deny = (message: string, status: number) => ({
    user: null as SessionUser | null,
    access: null as AdminAccess | null,
    error: NextResponse.json({ error: message }, { status }),
  });

  if (!user) return deny('Unauthorized.', 401);
  if (user.role !== 'admin') return deny('Forbidden.', 403);

  const access = await getAdminAccess(user.id);
  if (!access || access.accountStatus === 'suspended') {
    return deny('Your admin access has been suspended.', 403);
  }

  if (permission) {
    const needed = Array.isArray(permission) ? permission : [permission];
    if (!needed.some((p) => access.permissions.includes(p))) {
      return deny('Your role does not allow this action.', 403);
    }
  }

  return { user, access, error: null };
}

/** For shared (non-/api/admin) routes that have an admin branch. */
export async function adminCan(userId: string, permission: AdminPermission): Promise<boolean> {
  const access = await getAdminAccess(userId);
  return Boolean(access && access.accountStatus !== 'suspended' && access.permissions.includes(permission));
}

export async function logAdminAction(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await query(
    `INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.actorId, input.action, input.targetType, input.targetId || null, JSON.stringify(input.meta || {})],
  );
}

/** Number of active admins with full access, optionally excluding one user. */
export async function countActiveSuperAdmins(excludeUserId?: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM users u
       LEFT JOIN admin_roles r ON r.id = u.admin_role_id
      WHERE u.role = 'admin'
        AND u.account_status <> 'suspended'
        AND (u.admin_role_id IS NULL OR r.is_system = true)
        AND ($1::uuid IS NULL OR u.id <> $1::uuid)`,
    [excludeUserId || null],
  );
  return Number(row?.count || 0);
}
