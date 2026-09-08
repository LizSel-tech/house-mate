'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export default function ChatPrivacySettings({
  eyebrow = 'Preferences',
  portalLabel,
}: {
  eyebrow?: string;
  portalLabel: string;
}) {
  const [allowAdminChatReview, setAllowAdminChatReview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/profile');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Failed to load settings.');
          return;
        }
        setAllowAdminChatReview(data.user?.allowAdminChatReview !== false);
        setError('');
      } catch {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async (next: boolean) => {
    setSaving(true);
    setError('');
    setMessage('');
    const previous = allowAdminChatReview;
    setAllowAdminChatReview(next);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowAdminChatReview: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAllowAdminChatReview(previous);
        setError(data.error || 'Could not save preference.');
        return;
      }
      setAllowAdminChatReview(data.user?.allowAdminChatReview !== false);
      setMessage('Privacy preference saved.');
    } catch {
      setAllowAdminChatReview(previous);
      setError('Could not save preference.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          {eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Manage privacy and preferences for your {portalLabel} account.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{message}</p>
      )}

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Chat privacy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control whether Fixora admins can review your conversations
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name="ShieldCheckIcon" size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Allow admin chat review</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  When enabled, Fixora admins can view chats between you and the other party for safety
                  and dispute resolution. Admins only see a conversation if both participants allow it.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  See our{' '}
                  <Link href="/privacy" className="text-primary font-semibold">
                    privacy notice
                  </Link>
                  .
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowAdminChatReview}
              disabled={loading || saving}
              onClick={() => void save(!allowAdminChatReview)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                allowAdminChatReview ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  allowAdminChatReview ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-bold text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update your name, email, and photo from your profile page.
        </p>
        <Link
          href={
            portalLabel.toLowerCase().includes('provider')
              ? '/provider/profile'
              : '/user/profile'
          }
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-colors"
        >
          Open profile
          <Icon name="ArrowRightIcon" size={16} />
        </Link>
      </section>
    </div>
  );
}
