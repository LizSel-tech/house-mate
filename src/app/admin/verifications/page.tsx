'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from '@/components/admin/AdminUI';

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

function kycTone(status: string): 'success' | 'warning' | 'danger' | 'primary' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function DocChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors"
    >
      {label}
    </a>
  );
}

function Thumb({ href, label }: { href: string; label: string }) {
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block w-16 h-16 rounded-xl overflow-hidden border border-border bg-muted shrink-0"
      title={label}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={href} alt={label} className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-[10px] font-bold uppercase text-muted-foreground px-1 text-center">
          {label}
        </span>
      )}
    </a>
  );
}

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
      <AdminPageHeader
        eyebrow="Compliance"
        title="Verifications"
        description="Review artisan Ghana Card, selfie, and liveness frames, then approve or reject."
        actions={
          <div className="flex gap-2">
            <div className="rounded-xl border border-border bg-card px-3.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">KYC queue</p>
              <p className="text-lg font-extrabold text-foreground tabular-nums">{pendingKyc.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Legacy</p>
              <p className="text-lg font-extrabold text-foreground tabular-nums">{items.length}</p>
            </div>
          </div>
        }
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">KYC review queue</h2>
        {pendingKyc.length === 0 ? (
          <EmptyState icon="ShieldCheckIcon" title="No pending KYC submissions" />
        ) : (
          <div className="space-y-3">
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
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Recent KYC decisions</h2>
          <div className="space-y-3">
            {otherKyc.map((item) => (
              <KycCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Legacy document queue</h2>
        {items.length === 0 ? (
          <EmptyState icon="DocumentTextIcon" title="No pending legacy document submissions" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-foreground">{item.artisan.user.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.artisan.trade} · {item.artisan.serviceArea || 'No area'} · {item.artisan.user.phone}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ghana Card: {item.ghanaCardNumber || '—'} · Guarantor: {item.guarantorName || '—'} (
                      {item.guarantorPhone || '—'})
                    </p>
                  </div>
                  <StatusBadge tone="warning">Pending</StatusBadge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.ghanaCardUrl && <DocChip href={item.ghanaCardUrl} label="Ghana Card" />}
                  {item.policeReportUrl && <DocChip href={item.policeReportUrl} label="Police report" />}
                  {item.residenceProofUrl && <DocChip href={item.residenceProofUrl} label="Residence proof" />}
                  {item.skillsEvidenceUrls?.map((url, i) => (
                    <DocChip key={url} href={url} label={`Evidence ${i + 1}`} />
                  ))}
                </div>
                <div className="flex gap-2">
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
  const thumbs = [
    item.documentFrontUrl && { href: item.documentFrontUrl, label: 'Front' },
    item.documentBackUrl && { href: item.documentBackUrl, label: 'Back' },
    item.selfieUrl && { href: item.selfieUrl, label: 'Selfie' },
    ...(item.livenessImageUrls || []).slice(0, 8).map((url, i) => ({ href: url, label: `F${i + 1}` })),
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground">{item.user.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {[item.firstName, item.lastName].filter(Boolean).join(' ') || '—'} ·{' '}
            {item.artisan?.trade || 'Artisan'} · {item.artisan?.serviceArea || 'No area'} · {item.user.phone}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Ghana Card {item.ghanaCardNumber || '—'} · Artisan {item.artisan?.verificationStatus || '—'}
          </p>
          {item.failureReason && <p className="text-sm text-red-600 mt-1">{item.failureReason}</p>}
        </div>
        <StatusBadge tone={kycTone(item.status)}>{item.status}</StatusBadge>
      </div>

      {thumbs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {thumbs.map((t) => (
            <Thumb key={`${t.label}-${t.href}`} href={t.href} label={t.label} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {item.documentFrontUrl && <DocChip href={item.documentFrontUrl} label="Card front" />}
        {item.documentBackUrl && <DocChip href={item.documentBackUrl} label="Card back" />}
        {item.selfieUrl && <DocChip href={item.selfieUrl} label="Selfie" />}
        {item.livenessImageUrls?.slice(0, 8).map((url, i) => (
          <DocChip key={url} href={url} label={`Frame ${i + 1}`} />
        ))}
      </div>

      {item.status === 'pending' && onApprove && onReject && (
        <div className="flex gap-2 pt-1">
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
