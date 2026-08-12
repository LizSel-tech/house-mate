'use client';

import { FormEvent, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Method = {
  id: string;
  name: string;
  type: string;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminSettingsPage() {
  const [commissionRate, setCommissionRate] = useState('12');
  const [subscriptionFee, setSubscriptionFee] = useState('50');
  const [userSignupFee, setUserSignupFee] = useState('20');
  const [artisanSignupFee, setArtisanSignupFee] = useState('50');
  const [methods, setMethods] = useState<Method[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Method | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'mtn_momo',
    accountName: '',
    accountNumber: '',
    bankName: '',
    instructions: '',
    isActive: true,
  });

  const load = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    if (res.ok) {
      setCommissionRate(String(data.settings.commissionRate));
      setSubscriptionFee(String(data.settings.subscriptionFee));
      setUserSignupFee(String(data.settings.userSignupFee ?? 20));
      setArtisanSignupFee(String(data.settings.artisanSignupFee ?? 50));
      setMethods(data.methods || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveFees = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commissionRate,
        subscriptionFee,
        userSignupFee,
        artisanSignupFee,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed.');
      return;
    }
    setMessage('Fees saved.');
  };

  const resetMethodForm = () => {
    setEditing(null);
    setForm({
      name: '',
      type: 'mtn_momo',
      accountName: '',
      accountNumber: '',
      bankName: '',
      instructions: '',
      isActive: true,
    });
  };

  const saveMethod = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/payment-methods', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not save method.');
      return;
    }
    setMessage(editing ? 'Payment method updated.' : 'Payment method added.');
    resetMethodForm();
    await load();
  };

  const editMethod = (m: Method) => {
    setEditing(m);
    setForm({
      name: m.name,
      type: m.type,
      accountName: m.accountName || '',
      accountNumber: m.accountNumber || '',
      bankName: m.bankName || '',
      instructions: m.instructions || '',
      isActive: m.isActive,
    });
  };

  const toggleMethod = async (m: Method) => {
    await fetch('/api/admin/payment-methods', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, isActive: !m.isActive }),
    });
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Platform</p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Fees, commission, and payment method details shown on signup.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <form onSubmit={saveFees} className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'Commission rate (%)', value: commissionRate, set: setCommissionRate },
          { label: 'Subscription (GHS / month)', value: subscriptionFee, set: setSubscriptionFee },
          { label: 'Customer signup fee (GHS)', value: userSignupFee, set: setUserSignupFee },
          { label: 'Artisan signup fee (GHS)', value: artisanSignupFee, set: setArtisanSignupFee },
        ].map((field) => (
          <div key={field.label} className="rounded-3xl border border-border bg-card p-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{field.label}</p>
            <input
              type="number"
              min="0"
              step="0.1"
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-2xl font-extrabold"
            />
          </div>
        ))}
        <button
          type="submit"
          className="sm:col-span-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest w-fit"
        >
          Save fees
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground">Payment methods</h2>
          {editing && (
            <button type="button" onClick={resetMethodForm} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={saveMethod} className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-3xl">
          <p className="text-sm font-semibold text-foreground">
            {editing ? `Edit: ${editing.name}` : 'Add payment method'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Display name (e.g. MTN MoMo)"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
              required
            />
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            >
              <option value="mtn_momo">MTN MoMo</option>
              <option value="telecel_cash">Telecel Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
            <input
              value={form.accountName}
              onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="Account name"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            />
            <input
              value={form.accountNumber}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder="Account / MoMo number"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            />
            <input
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              placeholder="Bank name (if transfer)"
              className="sm:col-span-2 px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            />
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              placeholder="Instructions shown on signup"
              rows={2}
              className="sm:col-span-2 px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active on signup
          </label>
          <button
            type="submit"
            className="bg-secondary text-secondary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            {editing ? 'Update method' : 'Add method'}
          </button>
        </form>

        <div className="space-y-3">
          {methods.map((m) => (
            <div key={m.id} className="rounded-3xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-foreground">
                  {m.name}{' '}
                  <span className={`text-[10px] uppercase tracking-widest ${m.isActive ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {m.isActive ? 'active' : 'off'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {[m.accountName, m.accountNumber, m.bankName].filter(Boolean).join(' · ') || 'No details yet'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => editMethod(m)}
                  className="px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-widest"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleMethod(m)}
                  className="px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-widest"
                >
                  {m.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
          {methods.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Icon name="BanknotesIcon" size={16} /> No methods yet — defaults seed on first load.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
