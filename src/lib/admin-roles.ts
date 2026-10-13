import { isAdminPermission, type AdminPermission } from '@/lib/admin-permissions';

export type RoleInput = { name: string; description: string | null; permissions: AdminPermission[] };

export function parseRoleInput(body: {
  name?: string;
  description?: string;
  permissions?: unknown;
}): RoleInput | { error: string } {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim() || null;
  const permissions = Array.isArray(body.permissions)
    ? Array.from(new Set(body.permissions.map(String).filter(isAdminPermission)))
    : [];
  if (!name) return { error: 'Give the role a name.' };
  if (name.length > 60) return { error: 'Role name is too long.' };
  if (!permissions.length) return { error: 'Pick at least one permission.' };
  return { name, description, permissions };
}
