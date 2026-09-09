'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export default function ProfileMasthead({
  name,
  subtitle,
  badges,
  avatarUrl,
  coverUrl,
  meta,
}: {
  name?: string | null;
  subtitle?: string;
  badges?: { label: string; tone?: 'primary' | 'success' | 'muted' }[];
  avatarUrl?: string | null;
  coverUrl?: string | null;
  meta?: { label: string; value: string }[];
}) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState(coverUrl || null);
  const [avatar, setAvatar] = useState(avatarUrl || null);
  const [busy, setBusy] = useState<'cover' | 'avatar' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setCover(coverUrl || null), [coverUrl]);
  useEffect(() => setAvatar(avatarUrl || null), [avatarUrl]);

  const uploadCover = async (file: File) => {
    setError('');
    setBusy('cover');
    try {
      const form = new FormData();
      form.append('cover', file);
      const res = await fetch('/api/profile/cover', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Cover upload failed.');
        return;
      }
      setCover(data.coverUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const removeCover = async () => {
    setError('');
    setBusy('cover');
    try {
      const res = await fetch('/api/profile/cover', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not remove cover.');
        return;
      }
      setCover(null);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const uploadAvatar = async (file: File) => {
    setError('');
    setBusy('avatar');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Avatar upload failed.');
        return;
      }
      setAvatar(data.avatarUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setError('');
    setBusy('avatar');
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not remove photo.');
        return;
      }
      setAvatar(null);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative h-28 sm:h-36 overflow-hidden bg-secondary group">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, #292524 0%, #44403C 42%, #D97706 160%)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

        <div className="absolute top-3 right-3 flex flex-wrap gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            disabled={busy === 'cover'}
            onClick={() => coverInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black/55 backdrop-blur-sm text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black/70 disabled:opacity-50"
          >
            <Icon name="PhotoIcon" size={14} />
            {cover ? 'Change cover' : 'Add cover'}
          </button>
          {cover && (
            <button
              type="button"
              disabled={busy === 'cover'}
              onClick={() => void removeCover()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-black/55 backdrop-blur-sm text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black/70 disabled:opacity-50"
            >
              <Icon name="TrashIcon" size={14} />
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="relative px-5 sm:px-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 -mt-10 sm:-mt-14">
          <div className="relative size-24 sm:size-32 shrink-0 self-start">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={name || 'Profile photo'}
                className="h-full w-full rounded-full object-cover border-4 border-card shadow-md"
              />
            ) : (
              <div className="h-full w-full rounded-full border-4 border-card shadow-md bg-primary/10 text-primary flex items-center justify-center text-2xl sm:text-3xl font-extrabold">
                {initials(name)}
              </div>
            )}
            <button
              type="button"
              disabled={busy === 'avatar'}
              onClick={() => avatarInputRef.current?.click()}
              aria-label={avatar ? 'Change profile photo' : 'Upload profile photo'}
              className="absolute bottom-0.5 right-0.5 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-accent transition-colors disabled:opacity-60"
            >
              <Icon name="CameraIcon" size={16} />
            </button>
          </div>

          <div className="flex-1 min-w-0 pt-1 sm:pt-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground truncate">
                  {name || 'Your profile'}
                </h2>
                {subtitle && (
                  <p className="text-sm text-foreground/70 mt-0.5 capitalize">{subtitle}</p>
                )}
                {badges && badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          b.tone === 'success'
                            ? 'bg-green-100 text-green-800'
                            : b.tone === 'primary'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  loading={busy === 'avatar'}
                  onClick={() => avatarInputRef.current?.click()}
                  className="!rounded-xl !min-h-[36px] !px-3 !py-2"
                >
                  <Icon name="PhotoIcon" size={14} />
                  {avatar ? 'Change photo' : 'Upload photo'}
                </Button>
                {avatar && (
                  <Button
                    type="button"
                    variant="outline"
                    loading={busy === 'avatar'}
                    onClick={() => void removeAvatar()}
                    className="!rounded-xl !min-h-[36px] !px-3 !py-2 !border-red-200 !text-red-600 hover:!bg-red-50"
                  >
                    <Icon name="TrashIcon" size={14} />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {meta && meta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {meta.map((m) => (
                  <div key={m.label} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>
                    <span className="font-semibold text-foreground">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {busy ? 'Saving…' : 'JPEG, PNG, or WebP · max 5MB · hover cover to change on desktop'}
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadCover(file);
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadAvatar(file);
        }}
      />
    </div>
  );
}
