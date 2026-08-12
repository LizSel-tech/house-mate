'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type ArtisanDetail = {
  id: string;
  trade: string;
  bio: string | null;
  serviceArea: string | null;
  averageRating: number;
  jobsCompleted: number;
  user: { name: string; phone: string };
  services: {
    id: string;
    title: string;
    description: string | null;
    priceAmount: number;
    priceUnit: string;
  }[];
  reviews: { id: string; rating: number; comment: string | null; userName: string }[];
};

export default function ArtisanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [artisan, setArtisan] = useState<ArtisanDetail | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [location, setLocation] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/artisans/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setArtisan(data.artisan);
        if (data.artisan.services[0]) setServiceId(data.artisan.services[0].id);
      } else {
        setError(data.error || 'Not found');
      }
    };
    load();
  }, [params.id]);

  const book = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artisanId: params.id,
          serviceId,
          location,
          problemDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create booking.');
        return;
      }
      router.push('/user/bookings');
    } finally {
      setLoading(false);
    }
  };

  if (!artisan && !error) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!artisan) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Verified artisan
        </p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{artisan.user.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {artisan.trade} · {artisan.serviceArea || 'Service area TBD'} · {artisan.averageRating.toFixed(1)}★ ·{' '}
          {artisan.jobsCompleted} jobs
        </p>
        {artisan.bio && <p className="mt-4 text-foreground/80 max-w-2xl">{artisan.bio}</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Services</h2>
          {artisan.services.map((service) => (
            <div key={service.id} className="rounded-3xl border border-border bg-card p-5">
              <p className="font-bold">{service.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                GHS {service.priceAmount.toFixed(2)} / {service.priceUnit}
              </p>
              {service.description && (
                <p className="text-sm text-muted-foreground mt-2">{service.description}</p>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={book} className="rounded-3xl border border-border bg-card p-6 space-y-4 h-fit">
          <h2 className="text-lg font-bold">Request a booking</h2>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            required
          >
            {artisan.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — GHS {s.priceAmount.toFixed(2)}
              </option>
            ))}
          </select>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Job location"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            required
          />
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Describe the problem"
            rows={4}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || artisan.services.length === 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send booking request'}
          </button>
        </form>
      </div>

      {artisan.reviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Reviews</h2>
          {artisan.reviews.map((review) => (
            <div key={review.id} className="rounded-3xl border border-border bg-card p-5">
              <p className="font-semibold">{review.rating}★ · {review.userName}</p>
              {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
