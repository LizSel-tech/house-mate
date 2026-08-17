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

export default function ProfileAvatarEditor({
  name,
  avatarUrl,
  accent = 'secondary',
}: {
  name?: string | null;
  avatarUrl?: string | null;
  accent?: 'secondary' | 'primary';
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreview(avatarUrl || null);
  }, [avatarUrl]);

  const avatarClass =
    accent === 'primary'
      ? 'bg-primary/10 text-primary'
      : 'bg-secondary text-secondary-foreground';

  const upload = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed.');
        return;
      }
      setPreview(data.avatarUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not remove image.');
        return;
      }
      setPreview(null);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={name || 'Profile photo'}
              className="w-16 h-16 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold ${avatarClass}`}
            >
              {initials(name)}
            </div>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            aria-label={preview ? 'Change profile photo' : 'Upload profile photo'}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-accent transition-colors disabled:opacity-60"
          >
            <Icon name="CameraIcon" size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              loading={loading}
              onClick={() => inputRef.current?.click()}
              className="!min-h-[36px] !px-3 !py-2"
            >
              <Icon name="PhotoIcon" size={14} />
              {preview ? 'Change' : 'Upload'}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="outline"
                loading={loading}
                onClick={remove}
                className="!min-h-[36px] !px-3 !py-2 !border-red-200 !text-red-600 hover:!bg-red-50"
              >
                <Icon name="TrashIcon" size={14} />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Saving…' : 'JPEG, PNG, or WebP · max 5MB'}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
