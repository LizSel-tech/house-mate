'use client';

import { FormEvent, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';

type Bank = { name: string; code: string };
type Account = {
  type: 'mobile_money' | 'ghipss' | null;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  verified: boolean;
};

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'text-[11px] font-bold uppercase tracking-widest text-muted-foreground';

function mask(value: string | null) {
  if (!value) return '';
  return value.length <= 4 ? value : `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export default function PayoutAccountCard({ onSaved }: { onSaved?: () => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [options, setOptions] = useState<{ mobile_money: Bank[]; ghipss: Bank[] }>({
    mobile_money: [],
    ghipss: [],
  });
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<'mobile_money' | 'ghipss'>('mobile_money');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/provider/payout-account')
      .then((r) => r.json())
      .then((data) => {
        setAccount(data.account || null);
        setOptions(data.options || { mobile_money: [], ghipss: [] });
        setPaystackEnabled(Boolean(data.paystackEnabled));
        setEditing(!data.account);
      })
      .catch(() => setError('Could not load your payout account.'))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = () => {
    setType(account?.type || 'mobile_money');
    setBankCode(account?.bankCode || '');
    setAccountNumber(account?.accountNumber || '');
    setAccountName(account?.accountName || '');
    setError('');
    setMessage('');
    setEditing(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!bankCode) {
      setError(type === 'mobile_money' ? 'Choose your network.' : 'Choose your bank.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/provider/payout-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, bankCode, accountNumber, accountName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not save your payout account.');
        return;
      }
      setAccount(data.account);
      setEditing(false);
      setMessage(data.message || 'Payout account saved.');
      onSaved?.();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const choices = (type === 'mobile_money' ? options.mobile_money : options.ghipss).map((b) => ({
    value: b.code,
    label: b.name,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="BuildingLibraryIcon" size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Payout account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Where we send your earnings when a client confirms a job.
            </p>
          </div>
        </div>
        {account && !editing && (
          <Button type="button" variant="outline" onClick={startEdit} className="!rounded-xl !min-h-[36px]">
            Change
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-4 h-16 rounded-xl bg-muted/50 animate-pulse" />
      ) : !editing && account ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{account.accountName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {account.bankName} · {mask(account.accountNumber)}
            </p>
          </div>
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              account.verified || !paystackEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {account.verified || !paystackEnabled ? 'Ready for payouts' : 'Not verified'}
          </span>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {!account && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              Add an account so we can pay you automatically when clients confirm your jobs.
            </p>
          )}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/60 w-fit">
            {(
              [
                { id: 'mobile_money', label: 'Mobile money' },
                { id: 'ghipss', label: 'Bank account' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={t.id === 'ghipss' && options.ghipss.length === 0}
                onClick={() => {
                  setType(t.id);
                  setBankCode('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${
                  type === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className={labelClass}>{type === 'mobile_money' ? 'Network' : 'Bank'}</p>
              <Select
                value={bankCode}
                onChange={setBankCode}
                placeholder={type === 'mobile_money' ? 'Choose network' : 'Choose bank'}
                options={choices}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="payout-number" className={labelClass}>
                {type === 'mobile_money' ? 'Mobile money number' : 'Account number'}
              </label>
              <input
                id="payout-number"
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder={type === 'mobile_money' ? '024 123 4567' : '0123456789012'}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="payout-name" className={labelClass}>Name on the account</label>
              <input
                id="payout-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Kwame Mensah"
                className={inputClass}
                required
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {account && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="!rounded-xl"
              >
                Cancel
              </Button>
            )}
            <Button type="submit" loading={saving} className="!rounded-xl">
              Save payout account
            </Button>
          </div>
        </form>
      )}

      {message && (
        <p className="mt-4 text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}
    </div>
  );
}
