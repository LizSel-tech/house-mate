'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import ProfileAvatarEditor from '@/components/profile/ProfileAvatarEditor';
import {
  AdminPageHeader,
  Panel,
  StatusBadge,
  formatDateTime,
} from '@/components/admin/AdminUI';

type ProfileUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  location: string | null;
  accountStatus: string;
  avatarUrl: string | null;
  createdAt: string;
};

export default function AdminProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to load profile.');
        return;
      }
      const u = data.user as ProfileUser;
      setUser(u);
      setName(u.name || '');
      setEmail(u.email || '');
      setLocation(u.location || '');
      setError('');
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, location }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not save profile.');
        return;
      }
      setUser(data.user);
      setMessage('Profile updated.');
      router.refresh();
    } catch {
      setError('Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Account" title="Profile" description="Your admin account details for Fixora." />
        <div className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your admin identity, contact details, and avatar."
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{message}</p>
      )}

      <div className="grid xl:grid-cols-3 gap-6">
        <Panel title="Identity" description="How you appear across the admin portal" className="xl:col-span-1">
          <div className="space-y-5">
            <ProfileAvatarEditor
              name={user?.name}
              avatarUrl={user?.avatarUrl}
              accent="secondary"
            />
            <div>
              <p className="text-lg font-bold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Platform admin</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="primary">{user?.role || 'admin'}</StatusBadge>
              <StatusBadge tone={user?.accountStatus === 'active' ? 'success' : 'warning'}>
                {user?.accountStatus || 'active'}
              </StatusBadge>
            </div>
            <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Member since</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {user?.createdAt ? formatDateTime(user.createdAt) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User ID</dt>
                <dd className="mt-1 font-mono text-xs text-muted-foreground break-all">{user?.id}</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <div className="xl:col-span-2 space-y-6">
          <Panel title="Contact details" description="Used for OTP delivery and admin alerts">
            <form onSubmit={save} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Full name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phone
                  </span>
                  <input
                    value={user?.phone || ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Phone is your login identity and cannot be changed here.
                  </span>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Location
                  </span>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, region"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>
              <Button type="submit" loading={saving} className="!rounded-xl !min-h-[40px]">
                Save changes
              </Button>
            </form>
          </Panel>

          <Panel title="Security & access" description="How this admin account signs in">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon name="DevicePhoneMobileIcon" size={18} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">OTP login</p>
                  <p className="text-muted-foreground mt-0.5">
                    Sign-in codes are emailed to your address and tied to {user?.phone}.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon name="ShieldCheckIcon" size={18} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Admin privileges</p>
                  <p className="text-muted-foreground mt-0.5">
                    You can review payments, KYC, bookings, and chat conversations across Fixora.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon name="LockClosedIcon" size={18} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Session</p>
                  <p className="text-muted-foreground mt-0.5">
                    Use Sign out in the sidebar when finished on a shared device.
                  </p>
                </div>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
