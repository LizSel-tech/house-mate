'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import ProfileMasthead from '@/components/profile/ProfileMasthead';

type ProfileUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  accountStatus: string;
};

type ArtisanBits = {
  trade: string;
  serviceArea: string | null;
  verificationStatus: string;
  bio: string | null;
};

export default function ProviderProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [artisan, setArtisan] = useState<ArtisanBits | null>(null);
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
      const [profileRes, kycRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/kyc/session'),
      ]);
      const profileData = await profileRes.json().catch(() => ({}));
      const kycData = await kycRes.json().catch(() => ({}));

      if (!profileRes.ok) {
        setError(profileData.error || 'Failed to load profile.');
        return;
      }

      const u = profileData.user as ProfileUser;
      setUser(u);
      setName(u.name || '');
      setEmail(u.email || '');
      setLocation(u.location || '');

      if (kycRes.ok && kycData.profile) {
        setArtisan({
          trade: kycData.profile.trade || 'artisan',
          serviceArea: kycData.profile.serviceArea || null,
          verificationStatus: kycData.profile.verificationStatus || 'pending',
          bio: kycData.profile.bio || null,
        });
      }
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
      <div className="space-y-4 -mt-2 md:-mt-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Account
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Profile</h1>
        </div>
        <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  const verificationTone =
    artisan?.verificationStatus === 'approved'
      ? 'success'
      : artisan?.verificationStatus === 'rejected'
        ? 'muted'
        : 'primary';

  return (
    <div className="space-y-4 -mt-2 md:-mt-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Account
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-xl">
          Your public artisan presence on Fixora — cover, photo, and contact details.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      <ProfileMasthead
        name={user?.name}
        subtitle={artisan?.trade ? `${artisan.trade} · Service provider` : 'Service provider'}
        avatarUrl={user?.avatarUrl}
        coverUrl={user?.coverUrl}
        badges={[
          ...(artisan?.verificationStatus
            ? [
                {
                  label: artisan.verificationStatus,
                  tone: verificationTone as 'primary' | 'success' | 'muted',
                },
              ]
            : []),
          ...(user?.accountStatus
            ? [{ label: user.accountStatus.replace(/_/g, ' '), tone: 'muted' as const }]
            : []),
        ]}
        meta={[
          ...(user?.location ? [{ label: 'Location', value: user.location }] : []),
          ...(artisan?.serviceArea ? [{ label: 'Service area', value: artisan.serviceArea }] : []),
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold text-foreground">Bio</h2>
            {artisan?.bio ? (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{artisan.bio}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                No bio yet. Add a short introduction so customers know what you specialize in.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Update your bio from{' '}
              <Link href="/provider/verification" className="text-primary font-semibold">
                Verification
              </Link>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Contact details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Name and email customers and Fixora use to reach you
              </p>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-bold text-foreground">Quick links</h2>
            {[
              { href: '/provider/verification', icon: 'ShieldCheckIcon', label: 'Verification' },
              { href: '/provider/services', icon: 'WrenchScrewdriverIcon', label: 'Services' },
              { href: '/provider/settings', icon: 'Cog6ToothIcon', label: 'Settings' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name={item.icon} size={18} />
                </span>
                {item.label}
                <Icon name="ChevronRightIcon" size={16} className="ml-auto text-muted-foreground" />
              </Link>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-secondary text-secondary-foreground p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground/60">
              Tip
            </p>
            <p className="mt-2 text-sm leading-relaxed text-secondary-foreground/85">
              A clear cover and face photo help customers trust your listing when they search verified
              artisans.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
