import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { queryData } from '@/lib/db';
import type { KycVerification } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const [pendingDocs, kycRecords] = await Promise.all([
    queryData(
      `SELECT to_jsonb(d) || jsonb_build_object(
         'artisan', to_jsonb(a) || jsonb_build_object(
           'user', jsonb_build_object('id', u.id, 'name', u.name, 'phone', u.phone, 'email', u.email)
         )
       ) AS data
       FROM verification_documents d
       JOIN artisan_profiles a ON a.id = d.artisan_id
       JOIN users u ON u.id = a.user_id
       WHERE d.status = 'pending'
       ORDER BY d.created_at ASC`,
    ),
    queryData<KycVerification & Record<string, unknown>>(
      `SELECT to_jsonb(k) || jsonb_build_object(
         'user', jsonb_build_object('id', u.id, 'name', u.name, 'phone', u.phone, 'email', u.email),
         'artisan', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
           'id', a.id, 'trade', a.trade, 'service_area', a.service_area,
           'verification_status', a.verification_status
         ) END
       ) AS data
       FROM kyc_verifications k
       JOIN users u ON u.id = k.user_id
       LEFT JOIN artisan_profiles a ON a.id = k.artisan_id
       WHERE k.status IN ('pending', 'verified', 'rejected', 'error')
       ORDER BY k.submitted_at DESC NULLS LAST, k.created_at DESC
       LIMIT 50`,
    ),
  ]);

  const kyc = [...kycRecords].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return 0;
  });

  return NextResponse.json({
    verifications: pendingDocs,
    kyc,
  });
}
