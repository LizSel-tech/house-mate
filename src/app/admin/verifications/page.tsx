'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

type Verification = {
  id: string;
  ghanaCardNumber: string | null;
  ghanaCardUrl: string | null;
  policeReportUrl: string | null;
  residenceProofUrl: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  skillsEvidenceUrls: string[];
  artisan: {
    trade: string;
    serviceArea: string | null;
    user: { name: string; phone: string; email: string | null };
  };
};

type KycItem = {
  id: string;
  status: string;
  ghanaCardNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  selfieUrl: string | null;
  livenessImageUrls: string[];
  failureReason: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  user: { name: string; phone: string; email: string | null };
  artisan: {
    trade: string;
    serviceArea: string | null;
    verificationStatus: string;
  } | null;
};

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<Verification[]>([]);
  const [kycItems, setKycItems] = useState<KycItem[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/verifications');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Failed to load.');
      return;
    }
    setItems(data.verifications || []);
    setKycItems(data.kyc || []);
  };

  useEffect(() => {
    load();
  }, []);

  const decideDoc = async (id: string, status: 'approved' | 'rejected') => {
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Update failed.');
        return;
      }
      await load();
    } finally {
      setBusyId('');
    }
  };

  const decideKyc = async (id: string, status: 'approved' | 'rejected') => {
    setError('');
    setBusyId(id);
    try {
      const reason =
        status === 'rejected'
          ? window.prompt('Optional rejection reason (shown to the artisan):') || undefined
          : undefined;
      const res = await fetch(`/api/admin/kyc/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Update failed.');
        return;
      }
      await load();
    } finally {
      setBusyId('');
    }
  };

  const pendingKyc = kycItems.filter((k) => k.status === 'pending');
  const otherKyc = kycItems.filter((k) => k.status !== 'pending');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Verifications</h1>
        <p className="mt-2 text-muted-foreground">
          Review artisan Ghana Card, selfie, and liveness frames, then approve or reject.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          KYC review queue{pendingKyc.length ? ` (${pendingKyc.length})` : ''}
        </h2>
        {pendingKyc.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No pending KYC submissions.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingKyc.map((item) => (
              <KycCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onApprove={() => decideKyc(item.id, 'approved')}
                onReject={() => decideKyc(item.id, 'rejected')}
              />
            ))}
          </div>
        )}
      </section>

      {otherKyc.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Recent KYC decisions</h2>
          <div className="space-y-4">
            {otherKyc.map((item) => (
              <KycCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Legacy document queue</h2>
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No pending legacy document submissions.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border bg-card p-6 space-y-4">
                <div>
                  <p className="text-lg font-bold text-foreground">{item.artisan.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.artisan.trade} · {item.artisan.serviceArea || 'No area'} · {item.artisan.user.phone}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ghana Card: {item.ghanaCardNumber} · Guarantor: {item.guarantorName} ({item.guarantorPhone})
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {item.ghanaCardUrl && (
                    <a href={item.ghanaCardUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
                      Ghana Card
                    </a>
                  )}
                  {item.policeReportUrl && (
                    <a href={item.policeReportUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
                      Police report
                    </a>
                  )}
                  {item.residenceProofUrl && (
                    <a href={item.residenceProofUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
                      Residence proof
                    </a>
                  )}
                  {item.skillsEvidenceUrls?.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="text-primary font-semibold">
                      Evidence
                    </a>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    loading={busyId === item.id}
                    onClick={() => decideDoc(item.id, 'approved')}
                    className="!min-h-[40px]"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => decideDoc(item.id, 'rejected')}
                    className="!min-h-[40px]"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KycCard({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: KycItem;
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-3">
      <div>
        <p className="text-lg font-bold text-foreground">{item.user.name}</p>
        <p className="text-sm text-muted-foreground">
          {item.firstName} {item.lastName} · {item.artisan?.trade || 'Artisan'} ·{' '}
          {item.artisan?.serviceArea || 'No area'} · {item.user.phone}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          KYC {item.status.toUpperCase()} · Ghana Card {item.ghanaCardNumber || '—'} · Artisan{' '}
          {item.artisan?.verificationStatus || '—'}
        </p>
        {item.failureReason && <p className="text-sm text-red-600 mt-1">{item.failureReason}</p>}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {item.documentFrontUrl && (
          <a href={item.documentFrontUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
            Card front
          </a>
        )}
        {item.documentBackUrl && (
          <a href={item.documentBackUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
            Card back
          </a>
        )}
        {item.selfieUrl && (
          <a href={item.selfieUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
            Selfie
          </a>
        )}
        {item.livenessImageUrls?.slice(0, 8).map((url, i) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="text-primary font-semibold">
            Frame {i + 1}
          </a>
        ))}
      </div>
      {item.status === 'pending' && onApprove && onReject && (
        <div className="flex gap-3 pt-1">
          <Button type="button" loading={busy} onClick={onApprove} className="!min-h-[40px]">
            Approve
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={onReject} className="!min-h-[40px]">
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
