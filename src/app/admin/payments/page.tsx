'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdminPageHeader,
  EmptyState,
  KpiCard,
  StatusBadge,
  paymentStatusTone,
  formatDateTime,
  formatGhs,
} from '@/components/admin/AdminUI';
import { ConfirmModal, IconActionButton } from '@/components/admin/AdminModal';

type Payment = {
  id: string;
  amount: string | number;
  reference: string;
  proofUrl: string;
  status: string;
  role: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { name: string; phone: string; email: string | null; role: string };
  method: { name: string; type: string };
  reviewedBy: { name: string } | null;
};

type ModalState =
  | { type: 'confirm'; payment: Payment }
  | { type: 'reject'; payment: Payment }
  | null;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [modal, setModal] = useState<ModalState>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/payments');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Failed to load payments.');
      return;
    }
    setPayments(data.payments || []);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, status: 'confirmed' | 'rejected', reason?: string) => {
    setError('');
    setMessage('');
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Update failed.');
        return;
      }
      if (status === 'confirmed') {
        setMessage(
          data.warning
            ? `Payment confirmed, but OTP email failed: ${data.warning}`
            : data.otp?.email
              ? `Payment confirmed. OTP emailed to ${data.otp.email}.`
              : 'Payment confirmed. OTP emailed to the user.',
        );
      } else {
        setMessage('Payment rejected.');
      }
      setModal(null);
      setRejectReason('');
      await load();
    } finally {
      setBusyId('');
    }
  };

  const visible =
    filter === 'pending' ? payments.filter((p) => p.status === 'pending') : payments;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const confirmedCount = payments.filter((p) => p.status === 'confirmed').length;
  const confirmedAmount = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Registrations"
        title="Signup payments"
        description="Confirm payment proofs to activate accounts and auto-send login OTPs."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <KpiCard
          label="Pending reviews"
          value={String(pendingCount)}
          hint="Awaiting confirmation"
          icon="ClockIcon"
        />
        <KpiCard
          label="Confirmed"
          value={String(confirmedCount)}
          hint={`${formatGhs(confirmedAmount)} total confirmed`}
          icon="CheckBadgeIcon"
        />
      </div>

      <div className="flex gap-2">
        {([
          { id: 'pending' as const, label: 'Pending' },
          { id: 'all' as const, label: 'All' },
        ]).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon="BanknotesIcon"
          title="No payments here"
          description="New signup payments will appear in this queue."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['User', 'Role', 'Method', 'Amount', 'Reference', 'Status', 'Submitted', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground text-sm">{p.user.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.user.phone}
                        {p.user.email ? ` · ${p.user.email}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge tone="neutral">{p.role}</StatusBadge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{p.method.name}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                      {formatGhs(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[140px] break-all">
                      {p.reference}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge tone={paymentStatusTone(p.status)}>{p.status}</StatusBadge>
                      {p.rejectionReason && (
                        <p className="text-[11px] text-red-600 mt-1 max-w-[140px]">{p.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <IconActionButton
                          href={p.proofUrl}
                          icon="DocumentTextIcon"
                          label="View proof"
                          tone="neutral"
                        />
                        {p.status === 'pending' && (
                          <>
                            <IconActionButton
                              icon="CheckIcon"
                              label="Confirm payment"
                              tone="success"
                              disabled={busyId === p.id}
                              onClick={() => setModal({ type: 'confirm', payment: p })}
                            />
                            <IconActionButton
                              icon="XMarkIcon"
                              label="Reject payment"
                              tone="danger"
                              disabled={busyId === p.id}
                              onClick={() => {
                                setRejectReason('');
                                setModal({ type: 'reject', payment: p });
                              }}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modal?.type === 'confirm'}
        title="Confirm payment?"
        description={
          modal?.type === 'confirm'
            ? `Activate ${modal.payment.user.name}'s account and email a login OTP${
                modal.payment.user.email ? ` to ${modal.payment.user.email}` : ''
              }.`
            : undefined
        }
        icon="CheckCircleIcon"
        confirmLabel="Confirm & send OTP"
        loading={busyId === modal?.payment.id}
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (modal?.type === 'confirm') void decide(modal.payment.id, 'confirmed');
        }}
      >
        {modal?.type === 'confirm' && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">{formatGhs(Number(modal.payment.amount))}</p>
            <p className="text-muted-foreground">
              {modal.payment.method.name} · Ref {modal.payment.reference}
            </p>
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={modal?.type === 'reject'}
        title="Reject payment?"
        description={
          modal?.type === 'reject'
            ? `Reject ${modal.payment.user.name}'s signup payment. The account will stay pending.`
            : undefined
        }
        icon="XCircleIcon"
        confirmLabel="Reject payment"
        tone="danger"
        loading={busyId === modal?.payment.id}
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (modal?.type === 'reject') {
            void decide(modal.payment.id, 'rejected', rejectReason.trim() || undefined);
          }
        }}
      >
        <label className="block space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Reason (optional)
          </span>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Shown to the user if provided"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </ConfirmModal>
    </div>
  );
}
