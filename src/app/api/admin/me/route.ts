import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-access';

export async function GET() {
  const { user, access, error } = await requireAdmin();
  if (error || !user || !access) return error!;

  return NextResponse.json({
    id: user.id,
    roleId: access.roleId,
    roleName: access.roleName,
    isSuperAdmin: access.isSuperAdmin,
    permissions: access.permissions,
  });
}
