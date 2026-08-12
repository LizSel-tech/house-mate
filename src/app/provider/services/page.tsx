'use client';

import { FormEvent, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Service = {
  id: string;
  title: string;
  description: string | null;
  priceAmount: string | number;
  priceUnit: string;
  isActive: boolean;
};

export default function ProviderServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceUnit, setPriceUnit] = useState('job');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch('/api/provider/services');
    const data = await res.json();
    if (res.ok) setServices(data.services || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/provider/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priceAmount, priceUnit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create service.');
        return;
      }
      setTitle('');
      setDescription('');
      setPriceAmount('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (service: Service) => {
    await fetch(`/api/provider/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    await fetch(`/api/provider/services/${id}`, { method: 'DELETE' });
    await load();
  };

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Catalog</p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Services & prices</h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            List what you offer. Customers see these when they search verified artisans.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active</p>
            <p className="text-xl font-extrabold text-foreground">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="text-xl font-extrabold text-foreground">{services.length}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <form
          onSubmit={onCreate}
          className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="PlusIcon" size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Add a service</h2>
              <p className="text-xs text-muted-foreground">Title, price, and what’s included</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix leaking kitchen sink"
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what’s included"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price (GHS)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder="200"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unit</label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="job">Per job</option>
                <option value="hour">Per hour</option>
                <option value="visit">Per visit</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60 min-h-[44px]"
          >
            {loading ? 'Saving…' : 'Save service'}
          </button>
        </form>

        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your listings</h2>
          {services.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
                <Icon name="WrenchScrewdriverIcon" size={22} />
              </div>
              <p className="font-semibold text-foreground">No services yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first offering to appear in search.</p>
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="rounded-3xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      service.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon name="TagIcon" size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-foreground truncate">{service.title}</p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          service.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold text-foreground">
                        GHS {Number(service.priceAmount).toFixed(2)}
                      </span>{' '}
                      / {service.priceUnit}
                    </p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(service)}
                    className="px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors"
                  >
                    {service.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(service.id)}
                    className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
